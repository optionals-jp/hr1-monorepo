import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/messages_providers.dart';

/// 添付ファイルの署名付きURLを取得する FutureProvider.family
///
/// キャッシュキーは `storage_path`。自動破棄されるので、画面が閉じると再取得される。
/// Supabase の signed URL 有効期限はデフォルト 1 時間 = 3600秒。
final attachmentSignedUrlProvider = FutureProvider.autoDispose
    .family<String, String>((ref, storagePath) async {
      final repo = ref.read(messagesRepositoryProvider);
      return repo.createSignedAttachmentUrl(
        storagePath,
        expiresInSeconds: 3600,
      );
    });
