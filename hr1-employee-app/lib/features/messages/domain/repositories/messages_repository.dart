import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';

/// メッセージリポジトリインターフェース（社員向け）
abstract class MessagesRepository {
  /// 組織のスレッド一覧を取得
  Future<List<MessageThread>> getThreads(String organizationId, String userId);

  /// スレッドのメッセージ一覧を取得
  Future<List<Message>> getMessages(String threadId);

  /// メッセージを送信
  Future<Message> sendMessage({
    required String threadId,
    required String senderId,
    required String content,
  });

  /// スレッド内の未読メッセージを既読にする
  Future<void> markAsRead(String threadId, String userId);

  /// メッセージをページネーションで取得（カーソルベース）
  Future<List<Message>> getMessagesPaginated(
    String threadId, {
    DateTime? before,
    int limit = 30,
  });

  /// メッセージを編集
  Future<Message> editMessage(String messageId, String content);

  /// メッセージを削除
  Future<void> deleteMessage(String messageId);

  /// 送信者プロフィールを取得
  Future<Map<String, dynamic>> getSenderProfile(String senderId);
}
