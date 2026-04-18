import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_chat_controller.dart';

/// スレッドチャットのリアルタイム状態
class ThreadRealtimeState {
  const ThreadRealtimeState({
    this.messages = const [],
    this.loading = true,
    this.loadingMore = false,
    this.hasMore = true,
    this.otherUserTyping = false,
  });

  final List<Message> messages;
  final bool loading;
  final bool loadingMore;
  final bool hasMore;
  final bool otherUserTyping;

  ThreadRealtimeState copyWith({
    List<Message>? messages,
    bool? loading,
    bool? loadingMore,
    bool? hasMore,
    bool? otherUserTyping,
  }) {
    return ThreadRealtimeState(
      messages: messages ?? this.messages,
      loading: loading ?? this.loading,
      loadingMore: loadingMore ?? this.loadingMore,
      hasMore: hasMore ?? this.hasMore,
      otherUserTyping: otherUserTyping ?? this.otherUserTyping,
    );
  }
}

const _pageSize = 30;

/// スレッドチャットのリアルタイムコントローラー
///
/// Supabase Realtime（PostgresChanges）と Presence（タイピングインジケーター）を管理する。
///
/// V2 では message の UPDATE イベントを受信した際、`get_thread_messages` を再発行して
/// 添付・リアクション・メンション・reply_count を含めた最新状態を取得する
/// （reaction/attachment の INSERT/DELETE は `messages.updated_at` bump により伝播する）。
class ThreadRealtimeController
    extends
        AutoDisposeFamilyNotifier<
          ThreadRealtimeState,
          ({String threadId, String currentUserId})
        > {
  RealtimeChannel? _channel;
  RealtimeChannel? _presenceChannel;
  Timer? _typingDebounceTimer;
  Timer? _refreshDebounceTimer;
  bool _isTyping = false;

  String get _threadId => arg.threadId;
  String get _currentUserId => arg.currentUserId;

  @override
  ThreadRealtimeState build(({String threadId, String currentUserId}) arg) {
    ref.onDispose(_dispose);
    _init();
    return const ThreadRealtimeState();
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
      Supabase.instance.client.removeChannel(_channel!);
    }
    if (_presenceChannel != null) {
      Supabase.instance.client.removeChannel(_presenceChannel!);
    }
  }

  // ---------------------------------------------------------------------------
  // メッセージ取得
  // ---------------------------------------------------------------------------

  Future<void> _loadMessages() async {
    final controller = ref.read(threadChatControllerProvider.notifier);
    final messages = await controller.getMessagesV2(
      _threadId,
      limit: _pageSize,
    );
    state = state.copyWith(
      messages: messages,
      loading: false,
      hasMore: messages.length >= _pageSize,
    );
    // V2: スレッド単位での既読化
    controller.markThreadRead(_threadId);
  }

  /// 古いメッセージを読み込む（ページネーション）
  Future<void> loadOlderMessages() async {
    if (state.loadingMore || !state.hasMore || state.messages.isEmpty) return;
    state = state.copyWith(loadingMore: true);
    final controller = ref.read(threadChatControllerProvider.notifier);
    final oldestCreatedAt = state.messages.first.createdAt;
    final olderMessages = await controller.getMessagesV2(
      _threadId,
      before: oldestCreatedAt,
      limit: _pageSize,
    );
    state = state.copyWith(
      messages: [...olderMessages, ...state.messages],
      loadingMore: false,
      hasMore: olderMessages.length >= _pageSize,
    );
  }

  /// 可視レンジのメッセージを再取得（リアクション・添付変更に追従）
  ///
  /// 直近 [_pageSize] 件のみを `get_thread_messages` で再取得し、state に
  /// マージする。古いページは触らないので loadOlderMessages でロードした
  /// メッセージは保持される。
  Future<void> _refreshLatest() async {
    final controller = ref.read(threadChatControllerProvider.notifier);
    final latest = await controller.getMessagesV2(_threadId, limit: _pageSize);
    if (latest.isEmpty) return;
    final byId = {for (final m in latest) m.id: m};
    final merged = state.messages.map((m) => byId.remove(m.id) ?? m).toList();
    // latest に残った（= ローカルに無い）ものは新着として末尾に追加
    if (byId.isNotEmpty) {
      merged.addAll(byId.values);
      merged.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    }
    state = state.copyWith(messages: merged);
  }

  void _scheduleRefresh() {
    _refreshDebounceTimer?.cancel();
    _refreshDebounceTimer = Timer(
      const Duration(milliseconds: 250),
      _refreshLatest,
    );
  }

  // ---------------------------------------------------------------------------
  // Realtime（PostgresChanges）
  // ---------------------------------------------------------------------------

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
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
            // INSERT ペイロードだけでは添付・リアクション・送信者プロフィールが
            // 無いので、可視レンジを refresh してまとめて取り込む
            _scheduleRefresh();
            if ((newMsg['sender_id'] as String?) != _currentUserId) {
              ref
                  .read(threadChatControllerProvider.notifier)
                  .markThreadRead(_threadId);
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

            // ソフトデリートは即反映（本文を空にしてバブルをプレースホルダ化）
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

            // 編集（content / edited_at）は即反映、リアクション・添付追従は
            // updated_at bump で発火する UPDATE で refresh
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
  // Presence（タイピングインジケーター）
  // ---------------------------------------------------------------------------

  void _setupPresence() {
    _presenceChannel = Supabase.instance.client
        .channel(MessagesChannels.typing(_threadId))
        .onPresenceSync((payload) {
          final presences = _presenceChannel!.presenceState();
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
            await _presenceChannel!.track({
              MessagesChannels.payloadUserId: _currentUserId,
              MessagesChannels.payloadIsTyping: false,
            });
          }
        });
  }

  /// テキスト入力時にタイピング状態を送信する
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

  /// タイピング状態をリセットする（送信時など）
  void resetTyping() {
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({
      MessagesChannels.payloadUserId: _currentUserId,
      MessagesChannels.payloadIsTyping: false,
    });
  }
}

/// スレッドリアルタイムコントローラープロバイダー
final threadRealtimeControllerProvider =
    AutoDisposeNotifierProvider.family<
      ThreadRealtimeController,
      ThreadRealtimeState,
      ({String threadId, String currentUserId})
    >(ThreadRealtimeController.new);
