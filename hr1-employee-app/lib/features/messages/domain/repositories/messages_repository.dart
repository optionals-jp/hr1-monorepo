import 'package:hr1_shared/hr1_shared.dart';
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

  /// スレッド全体を既読にする（thread_read_states 更新 + 既存 read_at 互換）
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
