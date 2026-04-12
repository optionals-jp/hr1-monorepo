import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

/// スレッドチャット操作コントローラー
///
/// メッセージの送信・編集・削除・取得のビジネスロジックを管理する。
/// リアルタイム・プレゼンスはSupabase固有のため、ここでは扱わない。
class ThreadChatController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// メッセージ送信
  Future<void> sendMessage({
    required String threadId,
    required String senderId,
    required String content,
  }) async {
    await ref
        .read(messagesRepositoryProvider)
        .sendMessage(threadId: threadId, senderId: senderId, content: content);
  }

  /// メッセージ編集
  Future<void> editMessage(String messageId, String content) async {
    await ref.read(messagesRepositoryProvider).editMessage(messageId, content);
  }

  /// メッセージ削除
  Future<void> deleteMessage(String messageId) async {
    await ref.read(messagesRepositoryProvider).deleteMessage(messageId);
  }

  /// メッセージ取得（ページネーション）
  Future<List<Message>> getMessages(
    String threadId, {
    DateTime? before,
    int limit = 30,
  }) async {
    return ref
        .read(messagesRepositoryProvider)
        .getMessagesPaginated(threadId, before: before, limit: limit);
  }

  /// 既読にする
  Future<void> markAsRead(String threadId, String userId) async {
    await ref.read(messagesRepositoryProvider).markAsRead(threadId, userId);
  }

  /// 送信者プロフィールを取得
  Future<Map<String, dynamic>> getSenderProfile(String senderId) async {
    return ref.read(messagesRepositoryProvider).getSenderProfile(senderId);
  }
}

final threadChatControllerProvider =
    AutoDisposeNotifierProvider<ThreadChatController, void>(
      ThreadChatController.new,
    );
