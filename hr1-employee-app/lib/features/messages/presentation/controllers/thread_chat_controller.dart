import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/messages/domain/services/attachment_mime.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

/// 添付メッセージ送信のリクエスト DTO。
class AttachmentInput {
  const AttachmentInput({
    required this.bytes,
    required this.fileName,
    required this.byteSize,
    this.extension,
  });

  final Uint8List bytes;
  final String fileName;
  final int byteSize;
  final String? extension;
}

/// 添付付き送信の結果。`oversize` の場合はアップロードを中止する。
sealed class AttachmentSendResult {
  const AttachmentSendResult();
}

class AttachmentSendOk extends AttachmentSendResult {
  const AttachmentSendOk();
}

class AttachmentSendOversize extends AttachmentSendResult {
  const AttachmentSendOversize();
}

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

  /// 添付ファイルをアップロード→ メッセージ送信までの一連処理。
  ///
  /// サイズ上限を超えた場合は [AttachmentSendOversize] を返してアップロードを
  /// 行わない。Screen 側ではこの戻り値だけを判定して UI を出し分ける。
  Future<AttachmentSendResult> sendAttachmentMessage({
    required String threadId,
    required AttachmentInput attachment,
  }) async {
    if (attachment.byteSize > kMaxAttachmentBytes) {
      return const AttachmentSendOversize();
    }
    final user = ref.read(appUserProvider);
    if (user == null) {
      throw StateError('sendAttachmentMessage requires an authenticated user');
    }
    final mimeType = guessAttachmentMime(
      attachment.fileName,
      attachment.extension,
    );
    // send_message_v2 は attachments メタを受け取って DB 側で
    // message_attachments を INSERT する。Storage パスを先に確保するため
    // クライアント側で仮 ID を採番する（DB 側で message_id 確定後に
    // metadata を紐づける運用）。
    // microsecondsSinceEpoch + ハッシュコードで連投時の衝突を回避する
    // （高速タップで同一ミリ秒に入っても microseconds で分離可能）。
    final now = DateTime.now();
    final tempMessageKey =
        '${now.microsecondsSinceEpoch}_'
        '${identityHashCode(attachment).toRadixString(16)}';
    final storagePath = await uploadAttachment(
      organizationId: user.activeOrganizationId,
      threadId: threadId,
      messageId: tempMessageKey,
      bytes: attachment.bytes,
      fileName: attachment.fileName,
      mimeType: mimeType,
    );
    await sendMessageV2(
      threadId: threadId,
      content: '',
      attachments: [
        {
          'storage_path': storagePath,
          'file_name': attachment.fileName,
          'mime_type': mimeType,
          'byte_size': attachment.byteSize,
        },
      ],
    );
    return const AttachmentSendOk();
  }
}

final threadChatControllerProvider =
    AutoDisposeNotifierProvider<ThreadChatController, void>(
      ThreadChatController.new,
    );
