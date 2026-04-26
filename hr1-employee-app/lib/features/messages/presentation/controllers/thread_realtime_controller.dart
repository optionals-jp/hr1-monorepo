import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_realtime_event.dart';
import 'package:hr1_employee_app/features/messages/domain/repositories/message_thread_realtime.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_chat_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

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

/// スレッドチャットのリアルタイムコントローラー。
///
/// チャネル lifecycle は Repository（[MessageThreadRealtime]）が所有する。
/// ここでは Repository から流れる [MessageRealtimeEvent] を購読し、
/// state の差分更新と markRead / refresh をスケジュールする。
class ThreadRealtimeController
    extends
        AutoDisposeFamilyNotifier<
          ThreadRealtimeState,
          ({String threadId, String currentUserId})
        > {
  MessageThreadRealtime? _session;
  StreamSubscription<MessageRealtimeEvent>? _eventSubscription;
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
    _subscribe();
  }

  void _dispose() {
    _typingDebounceTimer?.cancel();
    _refreshDebounceTimer?.cancel();
    _eventSubscription?.cancel();
    _eventSubscription = null;
    _session?.dispose();
    _session = null;
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

  /// 可視レンジのメッセージを再取得（リアクション・添付変更に追従）。
  Future<void> _refreshLatest() async {
    final controller = ref.read(threadChatControllerProvider.notifier);
    final latest = await controller.getMessagesV2(_threadId, limit: _pageSize);
    if (latest.isEmpty) return;
    final byId = {for (final m in latest) m.id: m};
    final merged = state.messages.map((m) => byId.remove(m.id) ?? m).toList();
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
  // Realtime / Presence の購読（Repository 経由）
  // ---------------------------------------------------------------------------

  void _subscribe() {
    final repo = ref.read(messagesRepositoryProvider);
    _session = repo.openThreadRealtime(
      threadId: _threadId,
      currentUserId: _currentUserId,
    );
    _eventSubscription = _session!.events.listen(_handleEvent);
  }

  void _handleEvent(MessageRealtimeEvent event) {
    switch (event) {
      case MessageInserted():
        if (state.messages.any((m) => m.id == event.messageId)) return;
        // INSERT ペイロードだけでは添付・リアクション・送信者プロフィールが
        // 無いので、可視レンジを refresh してまとめて取り込む。
        _scheduleRefresh();
        if (event.senderId != _currentUserId) {
          ref
              .read(threadChatControllerProvider.notifier)
              .markThreadRead(_threadId);
        }
      case MessageSoftDeleted():
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id == event.messageId) {
              return m.copyWith(
                deletedAt: event.deletedAt,
                content: '',
                attachments: const [],
                reactions: const [],
              );
            }
            return m;
          }).toList(),
        );
      case MessageEdited():
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id == event.messageId) {
              return m.copyWith(
                content: event.content,
                editedAt: event.editedAt,
              );
            }
            return m;
          }).toList(),
        );
      case MessageRefreshNeeded():
        _scheduleRefresh();
      case TypingStateChanged():
        state = state.copyWith(otherUserTyping: event.otherUserTyping);
    }
  }

  /// テキスト入力時にタイピング状態を送信する。
  void onTextChanged(String text) {
    if (text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _session?.updateTyping(isTyping: true);
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        _session?.updateTyping(isTyping: false);
      }
    });
  }

  /// タイピング状態をリセットする（送信時など）。
  void resetTyping() {
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _session?.updateTyping(isTyping: false);
  }
}

/// スレッドリアルタイムコントローラープロバイダー
final threadRealtimeControllerProvider =
    AutoDisposeNotifierProvider.family<
      ThreadRealtimeController,
      ThreadRealtimeState,
      ({String threadId, String currentUserId})
    >(ThreadRealtimeController.new);
