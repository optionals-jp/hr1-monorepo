import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

/// スレッドチャット操作コントローラー
///
/// メッセージ送信・編集・削除・ページネーション取得・リアクション・添付アップロード等、
/// V2 RPC を経由したビジネスロジックを集約する。
/// リアルタイム購読・Presence は `ThreadRealtimeController` 側で扱う。
class ThreadChatController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// メッセージ送信 (V2 RPC)
  ///
  /// 戻り値はサーバー生成の message_id。UI 側ではリアルタイム INSERT で
  /// 正式な行が届くまで楽観更新を行ってもよい。
  Future<String> sendMessageV2({
    required String threadId,
    required String content,
    String? parentMessageId,
    List<String>? mentionedUserIds,
    List<Map<String, dynamic>>? attachments,
  }) async {
    return ref
        .read(messagesRepositoryProvider)
        .sendMessageV2(
          threadId: threadId,
          content: content,
          parentMessageId: parentMessageId,
          mentionedUserIds: mentionedUserIds,
          attachments: attachments,
        );
  }

  /// メッセージ編集（既存 API）
  Future<void> editMessage(String messageId, String content) async {
    await ref.read(messagesRepositoryProvider).editMessage(messageId, content);
  }

  /// メッセージ論理削除
  Future<void> softDeleteMessage(String messageId) async {
    await ref.read(messagesRepositoryProvider).softDeleteMessage(messageId);
  }

  /// メッセージ取得（V2 ページネーション）
  Future<List<Message>> getMessagesV2(
    String threadId, {
    DateTime? before,
    int limit = 30,
  }) async {
    return ref
        .read(messagesRepositoryProvider)
        .getThreadMessagesV2(threadId, before: before, limit: limit);
  }

  /// スレッド全体を既読にする
  Future<void> markThreadRead(String threadId) async {
    await ref.read(messagesRepositoryProvider).markThreadRead(threadId);
  }

  /// リアクションをトグルする。戻り値: 'added' / 'removed' / 'noop'
  Future<String> toggleReaction(String messageId, String emoji) async {
    return ref
        .read(messagesRepositoryProvider)
        .toggleMessageReaction(messageId, emoji);
  }

  /// 添付ファイルを Storage にアップロードし、storage_path を返す
  Future<String> uploadAttachment({
    required String organizationId,
    required String threadId,
    required String messageId,
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    return ref
        .read(messagesRepositoryProvider)
        .uploadAttachment(
          organizationId: organizationId,
          threadId: threadId,
          messageId: messageId,
          bytes: bytes,
          fileName: fileName,
          mimeType: mimeType,
        );
  }
}

final threadChatControllerProvider =
    AutoDisposeNotifierProvider<ThreadChatController, void>(
      ThreadChatController.new,
    );
