import 'package:flutter/material.dart';
import 'package:hr1_employee_app/features/feed/domain/entities/feed_post.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// フィード一覧 / 詳細画面で共用する投稿カード。
///
/// [showPinnedBanner] が true のとき先頭に「ピン留め・全社」バナーを表示する。
/// [onTap] を渡すとカード全体がタップ可能になる（一覧用）。
class FeedPostCard extends StatelessWidget {
  const FeedPostCard({
    super.key,
    required this.post,
    this.showPinnedBanner = false,
    this.onTap,
  });

  final FeedPost post;
  final bool showPinnedBanner;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (showPinnedBanner) const _PinnedBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: _PostHeader(post: post),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              post.body,
              style: AppTextStyles.body1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          if (post.hasImage) ...[
            const SizedBox(height: AppSpacing.sm),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: _PostImagePlaceholder(),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              0,
              AppSpacing.md,
              AppSpacing.md,
            ),
            child: _PostFooter(post: post),
          ),
        ],
      ),
    );
  }
}

class _PinnedBanner extends StatelessWidget {
  const _PinnedBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.10),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(14),
          topRight: Radius.circular(14),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.push_pin_rounded, size: 12, color: AppColors.warning),
          const SizedBox(width: 4),
          Text(
            'ピン留め・全社',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.warning,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _PostHeader extends StatelessWidget {
  const _PostHeader({required this.post});

  final FeedPost post;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        UserAvatar(
          initial: post.authorInitial,
          color: post.authorColor,
          size: 36,
        ),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                post.authorName,
                style: AppTextStyles.body2.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${post.authorRole}・${post.timeAgo}',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ),
        if (post.scope != null) _ScopeBadge(label: post.scope!),
        if (post.tag != null)
          _TagBadge(label: post.tag!, color: post.tagColor!),
      ],
    );
  }
}

class _ScopeBadge extends StatelessWidget {
  const _ScopeBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.brand.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: AppColors.brand,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _TagBadge extends StatelessWidget {
  const _TagBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _PostImagePlaceholder extends StatelessWidget {
  const _PostImagePlaceholder();

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 140,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFD9D2), Color(0xFFFCBFB7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Text(
            'IMAGE · DESIGN',
            style: AppTextStyles.caption1.copyWith(
              color: const Color(0xFFB04A3F),
              fontWeight: FontWeight.w600,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ),
    );
  }
}

class _PostFooter extends StatelessWidget {
  const _PostFooter({required this.post});

  final FeedPost post;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(Icons.favorite_rounded, size: 16, color: AppColors.error),
        const SizedBox(width: 4),
        Text(
          '${post.likes}',
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.textSecondary(context),
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 12),
        AppIcons.messageText(size: 16, color: AppColors.textSecondary(context)),
        const SizedBox(width: 4),
        Text(
          '${post.comments}',
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.textSecondary(context),
            fontWeight: FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          'コメント',
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.brand,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
