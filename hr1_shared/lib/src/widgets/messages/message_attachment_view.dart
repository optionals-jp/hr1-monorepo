import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 添付ビュー — 画像は CachedNetworkImage、それ以外はファイルカード
///
/// [signedUrl] は Supabase Storage の署名付きURL。呼び出し側で
/// `createSignedAttachmentUrl()` 経由で取得してから渡す。
class MessageAttachmentView extends StatelessWidget {
  const MessageAttachmentView({
    super.key,
    required this.attachment,
    required this.signedUrl,
    this.onTap,
  });

  final MessageAttachment attachment;
  final String? signedUrl;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (attachment.isImage) {
      return _buildImage(context);
    }
    return _buildFileCard(context);
  }

  Widget _buildImage(BuildContext context) {
    final maxW = MediaQuery.of(context).size.width * 0.6;
    final aspectRatio = (attachment.width != null && attachment.height != null)
        ? (attachment.width! / attachment.height!).clamp(0.5, 2.0)
        : 1.0;

    Widget child;
    if (signedUrl == null) {
      child = Container(
        color: AppColors.surfaceTertiary(context),
        child: const Center(child: LoadingIndicator(size: 20)),
      );
    } else {
      child = CachedNetworkImage(
        imageUrl: signedUrl!,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(
          color: AppColors.surfaceTertiary(context),
          child: const Center(child: LoadingIndicator(size: 20)),
        ),
        errorWidget: (_, __, ___) => Container(
          color: AppColors.surfaceTertiary(context),
          child: Icon(
            Icons.broken_image_outlined,
            color: AppColors.textTertiary(context),
          ),
        ),
      );
    }

    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.cornerRadius120),
        child: SizedBox(
          width: maxW,
          child: AspectRatio(aspectRatio: aspectRatio, child: child),
        ),
      ),
    );
  }

  Widget _buildFileCard(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface(context),
          borderRadius: BorderRadius.circular(AppRadius.cornerRadius120),
          border: Border.all(color: AppColors.border(context)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.insert_drive_file_outlined,
              size: AppSpacing.iconMd,
              color: AppColors.textSecondary(context),
            ),
            const SizedBox(width: AppSpacing.sm),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    attachment.fileName,
                    style: AppTextStyles.body2,
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                  Text(
                    _formatBytes(attachment.byteSize),
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatBytes(int bytes) {
    if (bytes < 1024) return '${bytes}B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)}KB';
    if (bytes < 1024 * 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
    }
    return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
  }
}
