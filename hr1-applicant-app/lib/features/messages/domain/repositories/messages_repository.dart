import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';

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

  // --- 製品レベル機能 (HR-27) ---

  /// スレッドのメッセージ一覧を取得（添付・リアクション・返信数含む）
  Future<List<Message>> getThreadMessagesV2(
    String threadId, {
    DateTime? before,
    int limit = 30,
  });

  /// メッセージ送信（添付・メンション・返信を原子挿入）
  Future<String> sendMessageV2({
    required String threadId,
    required String content,
    String? parentMessageId,
    List<String>? mentionedUserIds,
    List<Map<String, dynamic>>? attachments,
  });

  /// スレッド全体を既読にする
  Future<void> markThreadRead(String threadId);

  /// リアクションの追加／解除
  Future<String> toggleMessageReaction(String messageId, String emoji);

  /// 添付ファイルをアップロード
  Future<String> uploadAttachment({
    required String organizationId,
    required String threadId,
    required String messageId,
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  });

  /// 添付ファイルの署名付きURLを生成
  Future<String> createSignedAttachmentUrl(
    String storagePath, {
    int expiresInSeconds = 3600,
  });

  /// メッセージをソフトデリート
  Future<void> softDeleteMessage(String messageId);
}
