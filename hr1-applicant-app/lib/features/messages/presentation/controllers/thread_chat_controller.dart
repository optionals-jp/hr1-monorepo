import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_applicant_app/features/messages/domain/repositories/messages_repository.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/messages_providers.dart';

const threadChatPageSize = 30;

/// スレッドチャット画面の状態
class ThreadChatState {
  const ThreadChatState({
    this.messages = const [],
    this.isLoading = true,
    this.isLoadingMore = false,
    this.isSending = false,
    this.hasMore = true,
    this.otherUserTyping = false,
    this.error,
  });

  final List<Message> messages;
  final bool isLoading;
  final bool isLoadingMore;
  final bool isSending;
  final bool hasMore;
  final bool otherUserTyping;
  final String? error;

  ThreadChatState copyWith({
    List<Message>? messages,
    bool? isLoading,
    bool? isLoadingMore,
    bool? isSending,
    bool? hasMore,
    bool? otherUserTyping,
    String? error,
  }) {
    return ThreadChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isSending: isSending ?? this.isSending,
      hasMore: hasMore ?? this.hasMore,
      otherUserTyping: otherUserTyping ?? this.otherUserTyping,
      error: error,
    );
  }
}

/// スレッドチャットコントローラー
///
/// V2 RPC 経由でメッセージ取得・送信（添付・メンション）・リアクション・
/// ソフトデリート・スレッド既読化を行う。Realtime と Presence もここで管理する。
class ThreadChatController
    extends
        AutoDisposeFamilyNotifier<
          ThreadChatState,
          ({String threadId, String currentUserId})
        > {
  late final MessagesRepository _repo;
  late final SupabaseClient _supabaseClient;

  RealtimeChannel? _channel;
  RealtimeChannel? _presenceChannel;
  Timer? _typingDebounceTimer;
  Timer? _refreshDebounceTimer;
  bool _isTyping = false;

  String get _threadId => arg.threadId;
  String get _currentUserId => arg.currentUserId;

  @override
  ThreadChatState build(({String threadId, String currentUserId}) arg) {
    _repo = ref.watch(messagesRepositoryProvider);
    _supabaseClient = ref.watch(supabaseClientProvider);
    ref.onDispose(_dispose);
    _init();
    return const ThreadChatState();
  }

  Future<void> _init() async {
    await _loadMessages();
    _subscribeRealtime();
    _setupPresence();
  }

  void _dispose() {
    _typingDebounceTimer?.cancel();
    _refreshDebounceTimer?.cancel();
    if (_channel != null) {
      _supabaseClient.removeChannel(_channel!);
    }
    if (_presenceChannel != null) {
      _supabaseClient.removeChannel(_presenceChannel!);
    }
  }

  // ---------------------------------------------------------------------------
  // メッセージ取得
  // ---------------------------------------------------------------------------

  Future<void> _loadMessages() async {
    try {
      final messages = await _repo.getThreadMessagesV2(
        _threadId,
        limit: threadChatPageSize,
      );
      state = state.copyWith(
        messages: messages,
        isLoading: false,
        hasMore: messages.length >= threadChatPageSize,
      );
      await _repo.markThreadRead(_threadId);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'メッセージの読み込みに失敗しました');
    }
  }

  Future<void> loadOlderMessages() async {
    if (state.messages.isEmpty || state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final oldestCreatedAt = state.messages.first.createdAt;
      final olderMessages = await _repo.getThreadMessagesV2(
        _threadId,
        before: oldestCreatedAt,
        limit: threadChatPageSize,
      );
      state = state.copyWith(
        messages: [...olderMessages, ...state.messages],
        isLoadingMore: false,
        hasMore: olderMessages.length >= threadChatPageSize,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false);
    }
  }

  Future<void> _refreshLatest() async {
    try {
      final latest = await _repo.getThreadMessagesV2(
        _threadId,
        limit: threadChatPageSize,
      );
      if (latest.isEmpty) return;
      final byId = {for (final m in latest) m.id: m};
      final merged = state.messages.map((m) => byId.remove(m.id) ?? m).toList();
      if (byId.isNotEmpty) {
        merged.addAll(byId.values);
        merged.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      }
      state = state.copyWith(messages: merged);
    } catch (_) {
      // refresh の失敗は黙って無視（次の UPDATE で再トリガー）
    }
  }

  void _scheduleRefresh() {
    _refreshDebounceTimer?.cancel();
    _refreshDebounceTimer = Timer(
      const Duration(milliseconds: 250),
      _refreshLatest,
    );
  }

  // ---------------------------------------------------------------------------
  // メッセージ操作
  // ---------------------------------------------------------------------------

  Future<bool> sendMessage({
    required String content,
    List<Map<String, dynamic>>? attachments,
  }) async {
    if ((content.isEmpty && (attachments == null || attachments.isEmpty)) ||
        state.isSending ||
        content.length > 5000) {
      return false;
    }

    state = state.copyWith(isSending: true);
    resetTyping();

    try {
      await _repo.sendMessageV2(
        threadId: _threadId,
        content: content,
        mentionedUserIds: extractMentionedUserIds(content),
        attachments: attachments,
      );
      state = state.copyWith(isSending: false);
      return true;
    } catch (e) {
      state = state.copyWith(isSending: false, error: 'メッセージの送信に失敗しました');
      return false;
    }
  }

  Future<bool> editMessage(String messageId, String newContent) async {
    if (newContent.isEmpty) return false;
    try {
      final updated = await _repo.editMessage(messageId, newContent);
      state = state.copyWith(
        messages: state.messages.map((m) {
          return m.id == updated.id ? updated : m;
        }).toList(),
      );
      return true;
    } catch (e) {
      state = state.copyWith(error: 'メッセージの編集に失敗しました');
      return false;
    }
  }

  Future<bool> softDeleteMessage(String messageId) async {
    try {
      await _repo.softDeleteMessage(messageId);
      // Realtime UPDATE で deleted_at 反映。楽観的にも state を置換しておく。
      state = state.copyWith(
        messages: state.messages.map((m) {
          if (m.id == messageId) {
            return m.copyWith(
              deletedAt: DateTime.now().toUtc(),
              content: '',
              attachments: const [],
              reactions: const [],
            );
          }
          return m;
        }).toList(),
      );
      return true;
    } catch (e) {
      state = state.copyWith(error: 'メッセージの削除に失敗しました');
      return false;
    }
  }

  Future<bool> toggleReaction(String messageId, String emoji) async {
    try {
      await _repo.toggleMessageReaction(messageId, emoji);
      return true;
    } catch (e) {
      state = state.copyWith(error: 'リアクションの変更に失敗しました');
      return false;
    }
  }

  Future<String?> uploadAttachmentBytes({
    required String organizationId,
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    try {
      final tempKey = DateTime.now().millisecondsSinceEpoch.toString();
      return await _repo.uploadAttachment(
        organizationId: organizationId,
        threadId: _threadId,
        messageId: tempKey,
        bytes: bytes,
        fileName: fileName,
        mimeType: mimeType,
      );
    } catch (e) {
      state = state.copyWith(error: 'ファイルの添付に失敗しました');
      return null;
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }

  // ---------------------------------------------------------------------------
  // Realtime (PostgresChanges)
  // ---------------------------------------------------------------------------

  void _subscribeRealtime() {
    _channel = _supabaseClient
        .channel(MessagesChannels.messages(_threadId))
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: _threadId,
          ),
          callback: (payload) async {
            final newMsg = payload.newRecord;
            if (newMsg.isEmpty) return;
            if (state.messages.any((m) => m.id == newMsg['id'])) return;
            _scheduleRefresh();
            if ((newMsg['sender_id'] as String?) != _currentUserId) {
              await _repo.markThreadRead(_threadId);
            }
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: _threadId,
          ),
          callback: (payload) {
            final updated = payload.newRecord;
            if (updated.isEmpty) return;

            if (updated['deleted_at'] != null) {
              state = state.copyWith(
                messages: state.messages.map((m) {
                  if (m.id == updated['id']) {
                    return m.copyWith(
                      deletedAt: DateTime.parse(
                        updated['deleted_at'] as String,
                      ),
                      content: '',
                      attachments: const [],
                      reactions: const [],
                    );
                  }
                  return m;
                }).toList(),
              );
              return;
            }

            state = state.copyWith(
              messages: state.messages.map((m) {
                if (m.id == updated['id']) {
                  return m.copyWith(
                    content: updated['content'] as String?,
                    editedAt: updated['edited_at'] != null
                        ? DateTime.parse(updated['edited_at'] as String)
                        : null,
                  );
                }
                return m;
              }).toList(),
            );
            _scheduleRefresh();
          },
        )
        .subscribe();
  }

  // ---------------------------------------------------------------------------
  // Presence (タイピングインジケーター)
  // ---------------------------------------------------------------------------

  void _setupPresence() {
    _presenceChannel = _supabaseClient
        .channel(MessagesChannels.typing(_threadId))
        .onPresenceSync((payload) {
          final presences = _presenceChannel?.presenceState();
          if (presences == null) return;

          bool otherTyping = false;
          for (final s in presences) {
            for (final presence in s.presences) {
              if (presence.payload[MessagesChannels.payloadUserId] !=
                      _currentUserId &&
                  presence.payload[MessagesChannels.payloadIsTyping] == true) {
                otherTyping = true;
                break;
              }
            }
            if (otherTyping) break;
          }
          state = state.copyWith(otherUserTyping: otherTyping);
        })
        .subscribe((status, [error]) async {
          if (status == RealtimeSubscribeStatus.subscribed) {
            await _presenceChannel?.track({
              MessagesChannels.payloadUserId: _currentUserId,
              MessagesChannels.payloadIsTyping: false,
            });
          }
        });
  }

  void onTextChanged(String text) {
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _presenceChannel?.track({
        MessagesChannels.payloadUserId: _currentUserId,
        MessagesChannels.payloadIsTyping: true,
      });
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        _presenceChannel?.track({
          MessagesChannels.payloadUserId: _currentUserId,
          MessagesChannels.payloadIsTyping: false,
        });
      }
    });
  }

  void resetTyping() {
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({
      MessagesChannels.payloadUserId: _currentUserId,
      MessagesChannels.payloadIsTyping: false,
    });
  }
}

/// スレッドチャットコントローラープロバイダー
final threadChatControllerProvider = NotifierProvider.autoDispose
    .family<
      ThreadChatController,
      ThreadChatState,
      ({String threadId, String currentUserId})
    >(ThreadChatController.new);
