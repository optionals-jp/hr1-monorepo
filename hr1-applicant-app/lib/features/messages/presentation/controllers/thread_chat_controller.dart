import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';
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
/// メッセージ取得・送信・編集・削除、Realtime購読、Presence管理を統合。
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
      final messages = await _repo.getMessagesPaginated(
        _threadId,
        limit: threadChatPageSize,
      );
      state = state.copyWith(
        messages: messages,
        isLoading: false,
        hasMore: messages.length >= threadChatPageSize,
      );
      _repo.markAsRead(_threadId, _currentUserId);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'メッセージの読み込みに失敗しました');
    }
  }

  Future<void> loadOlderMessages() async {
    if (state.messages.isEmpty || state.isLoadingMore || !state.hasMore) return;

    state = state.copyWith(isLoadingMore: true);
    try {
      final oldestCreatedAt = state.messages.first.createdAt;
      final olderMessages = await _repo.getMessagesPaginated(
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

  // ---------------------------------------------------------------------------
  // メッセージ操作
  // ---------------------------------------------------------------------------

  Future<bool> sendMessage({required String content}) async {
    if (content.isEmpty || state.isSending || content.length > 5000) {
      return false;
    }

    state = state.copyWith(isSending: true);
    resetTyping();

    try {
      await _repo.sendMessage(
        threadId: _threadId,
        senderId: _currentUserId,
        content: content,
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

  Future<bool> deleteMessage(String messageId) async {
    try {
      await _repo.deleteMessage(messageId);
      state = state.copyWith(
        messages: state.messages.where((m) => m.id != messageId).toList(),
      );
      return true;
    } catch (e) {
      state = state.copyWith(error: 'メッセージの削除に失敗しました');
      return false;
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
        .channel('messages:$_threadId')
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
            final msg = await _buildMessageWithSender(newMsg);
            if (!state.messages.any((m) => m.id == msg.id)) {
              state = state.copyWith(messages: [...state.messages, msg]);
            }
            if (msg.senderId != _currentUserId) {
              _repo.markAsRead(_threadId, _currentUserId);
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
          callback: (payload) async {
            final updated = payload.newRecord;
            if (updated.isEmpty) return;
            final msg = await _buildMessageWithSender(updated);
            state = state.copyWith(
              messages: state.messages.map((m) {
                return m.id == msg.id ? msg : m;
              }).toList(),
            );
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.delete,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: _threadId,
          ),
          callback: (payload) {
            final oldRecord = payload.oldRecord;
            if (oldRecord.isEmpty) return;
            final deletedId = oldRecord['id'] as String?;
            if (deletedId == null) return;
            state = state.copyWith(
              messages: state.messages.where((m) => m.id != deletedId).toList(),
            );
          },
        )
        .subscribe();
  }

  Future<Message> _buildMessageWithSender(Map<String, dynamic> record) async {
    final senderResponse = await _repo.getSenderProfile(
      record['sender_id'] as String,
    );
    return Message.fromJson({...record, 'sender': senderResponse});
  }

  // ---------------------------------------------------------------------------
  // Presence (タイピングインジケーター)
  // ---------------------------------------------------------------------------

  void _setupPresence() {
    _presenceChannel = _supabaseClient
        .channel('typing:$_threadId')
        .onPresenceSync((payload) {
          final presences = _presenceChannel?.presenceState();
          if (presences == null) return;

          bool otherTyping = false;
          for (final s in presences) {
            for (final presence in s.presences) {
              if (presence.payload['user_id'] != _currentUserId &&
                  presence.payload['typing'] == true) {
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
              'user_id': _currentUserId,
              'typing': false,
            });
          }
        });
  }

  void onTextChanged(String text) {
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _presenceChannel?.track({'user_id': _currentUserId, 'typing': true});
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        _presenceChannel?.track({'user_id': _currentUserId, 'typing': false});
      }
    });
  }

  void resetTyping() {
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({'user_id': _currentUserId, 'typing': false});
  }
}

/// スレッドチャットコントローラープロバイダー
final threadChatControllerProvider = NotifierProvider.autoDispose
    .family<
      ThreadChatController,
      ThreadChatState,
      ({String threadId, String currentUserId})
    >(ThreadChatController.new);
