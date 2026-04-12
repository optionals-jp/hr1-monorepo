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
/// 画面からリアルタイム固有ロジックを分離し、テスト容易性を向上させる。
class ThreadRealtimeController
    extends
        AutoDisposeFamilyNotifier<
          ThreadRealtimeState,
          ({String threadId, String currentUserId})
        > {
  RealtimeChannel? _channel;
  RealtimeChannel? _presenceChannel;
  Timer? _typingDebounceTimer;
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
    final messages = await controller.getMessages(_threadId, limit: _pageSize);
    state = state.copyWith(
      messages: messages,
      loading: false,
      hasMore: messages.length >= _pageSize,
    );
    controller.markAsRead(_threadId, _currentUserId);
  }

  /// 古いメッセージを読み込む（ページネーション）
  Future<void> loadOlderMessages() async {
    if (state.loadingMore || !state.hasMore || state.messages.isEmpty) return;
    state = state.copyWith(loadingMore: true);
    final controller = ref.read(threadChatControllerProvider.notifier);
    final oldestCreatedAt = state.messages.first.createdAt;
    final olderMessages = await controller.getMessages(
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

  // ---------------------------------------------------------------------------
  // Realtime（PostgresChanges）
  // ---------------------------------------------------------------------------

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
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
            final senderResponse = await ref
                .read(threadChatControllerProvider.notifier)
                .getSenderProfile(newMsg['sender_id'] as String);
            final msg = Message.fromJson({...newMsg, 'sender': senderResponse});
            if (!state.messages.any((m) => m.id == msg.id)) {
              state = state.copyWith(messages: [...state.messages, msg]);
            }
            if (msg.senderId != _currentUserId) {
              ref
                  .read(threadChatControllerProvider.notifier)
                  .markAsRead(_threadId, _currentUserId);
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
            final old = payload.oldRecord;
            if (old.isEmpty) return;
            state = state.copyWith(
              messages: state.messages.where((m) => m.id != old['id']).toList(),
            );
          },
        )
        .subscribe();
  }

  // ---------------------------------------------------------------------------
  // Presence（タイピングインジケーター）
  // ---------------------------------------------------------------------------

  void _setupPresence() {
    _presenceChannel = Supabase.instance.client
        .channel('typing:$_threadId')
        .onPresenceSync((payload) {
          final presences = _presenceChannel!.presenceState();
          bool otherTyping = false;
          for (final s in presences) {
            for (final presence in s.presences) {
              if (presence.payload['user_id'] != _currentUserId &&
                  presence.payload['is_typing'] == true) {
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
              'user_id': _currentUserId,
              'is_typing': false,
            });
          }
        });
  }

  /// テキスト入力時にタイピング状態を送信する
  void onTextChanged(String text) {
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _presenceChannel?.track({'user_id': _currentUserId, 'is_typing': true});
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        _presenceChannel?.track({
          'user_id': _currentUserId,
          'is_typing': false,
        });
      }
    });
  }

  /// タイピング状態をリセットする（送信時など）
  void resetTyping() {
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({'user_id': _currentUserId, 'is_typing': false});
  }
}

/// スレッドリアルタイムコントローラープロバイダー
final threadRealtimeControllerProvider =
    AutoDisposeNotifierProvider.family<
      ThreadRealtimeController,
      ThreadRealtimeState,
      ({String threadId, String currentUserId})
    >(ThreadRealtimeController.new);
