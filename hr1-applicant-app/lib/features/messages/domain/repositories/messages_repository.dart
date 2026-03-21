import '../entities/message_thread.dart';

/// メッセージリポジトリインターフェース
abstract class MessagesRepository {
  /// ユーザーのスレッド一覧を取得
  Future<List<MessageThread>> getThreads(
    String userId, {
    String? organizationId,
  });

  /// スレッドのメッセージ一覧を取得
  Future<List<Message>> getMessages(String threadId);

  /// スレッドのメッセージをページネーション付きで取得（新しい順）
  Future<List<Message>> getMessagesPaginated(
    String threadId, {
    DateTime? before,
    int limit = 30,
  });

  /// メッセージを送信
  Future<Message> sendMessage({
    required String threadId,
    required String senderId,
    required String content,
  });

  /// メッセージを編集
  Future<Message> editMessage(String messageId, String content);

  /// メッセージを削除
  Future<void> deleteMessage(String messageId);

  /// スレッド内の未読メッセージを既読にする
  Future<void> markAsRead(String threadId, String userId);

  /// 送信者プロフィールを取得
  Future<Map<String, dynamic>> getSenderProfile(String senderId);

  /// 企業との1対1スレッドを取得または作成
  Future<MessageThread> getOrCreateThread({
    required String userId,
    required String organizationId,
  });
}
