import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';
import '../providers/messages_providers.dart';

const threadChatPageSize = 30;

/// スレッドチャット画面の状態
class ThreadChatState {
  const ThreadChatState({
    this.messages = const [],
    this.isLoading = true,
    this.isLoadingMore = false,
    this.isSending = false,
    this.hasMore = true,
    this.error,
  });

  final List<Message> messages;
  final bool isLoading;
  final bool isLoadingMore;
  final bool isSending;
  final bool hasMore;
  final String? error;

  ThreadChatState copyWith({
    List<Message>? messages,
    bool? isLoading,
    bool? isLoadingMore,
    bool? isSending,
    bool? hasMore,
    String? error,
  }) {
    return ThreadChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      isSending: isSending ?? this.isSending,
      hasMore: hasMore ?? this.hasMore,
      error: error,
    );
  }
}

/// スレッドチャットコントローラー
class ThreadChatController
    extends AutoDisposeFamilyNotifier<ThreadChatState, String> {
  late final MessagesRepository _repo;
  late final String _threadId;

  @override
  ThreadChatState build(String arg) {
    _threadId = arg;
    _repo = ref.watch(messagesRepositoryProvider);
    return const ThreadChatState();
  }

  /// 初期メッセージ読み込み
  Future<void> loadMessages(String currentUserId) async {
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
      // 未読を既読にする
      _repo.markAsRead(_threadId, currentUserId);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'メッセージの読み込みに失敗しました');
    }
  }

  /// 古いメッセージの読み込み（ページネーション）
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
      state = state.copyWith(
        isLoadingMore: false,
        error: '過去のメッセージの読み込みに失敗しました',
      );
    }
  }

  /// メッセージ送信
  ///
  /// 成功時は true、失敗時は false を返す。
  Future<bool> sendMessage({
    required String senderId,
    required String content,
  }) async {
    if (content.isEmpty || state.isSending || content.length > 5000) {
      return false;
    }

    state = state.copyWith(isSending: true);

    try {
      await _repo.sendMessage(
        threadId: _threadId,
        senderId: senderId,
        content: content,
      );
      state = state.copyWith(isSending: false);
      return true;
    } catch (e) {
      state = state.copyWith(isSending: false, error: 'メッセージの送信に失敗しました');
      return false;
    }
  }

  /// メッセージ編集
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

  /// メッセージ削除
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

  /// Realtime で受信した新規メッセージを追加
  void addRealtimeMessage(Message message) {
    if (!state.messages.any((m) => m.id == message.id)) {
      state = state.copyWith(messages: [...state.messages, message]);
    }
  }

  /// Realtime で受信した更新メッセージを反映
  void updateRealtimeMessage(Message message) {
    state = state.copyWith(
      messages: state.messages.map((m) {
        return m.id == message.id ? message : m;
      }).toList(),
    );
  }

  /// Realtime で受信した削除メッセージを反映
  void removeRealtimeMessage(String messageId) {
    state = state.copyWith(
      messages: state.messages.where((m) => m.id != messageId).toList(),
    );
  }

  /// 既読にする
  Future<void> markAsRead(String currentUserId) async {
    await _repo.markAsRead(_threadId, currentUserId);
  }

  /// 送信者プロフィールを取得してメッセージを構築
  Future<Message> buildMessageWithSender(Map<String, dynamic> record) async {
    final senderResponse = await _repo.getSenderProfile(
      record['sender_id'] as String,
    );
    return Message.fromJson({...record, 'sender': senderResponse});
  }

  /// エラーをクリア
  void clearError() {
    state = state.copyWith(error: null);
  }
}

/// スレッドチャットコントローラープロバイダー
final threadChatControllerProvider = NotifierProvider.autoDispose
    .family<ThreadChatController, ThreadChatState, String>(
      ThreadChatController.new,
    );
