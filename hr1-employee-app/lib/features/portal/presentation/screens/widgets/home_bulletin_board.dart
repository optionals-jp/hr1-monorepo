import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/filter_tabs_row.dart';
import 'package:hr1_shared/hr1_shared.dart';

class _BulletinPost {
  const _BulletinPost({
    required this.authorInitial,
    required this.authorColor,
    required this.authorName,
    required this.authorRole,
    required this.timeAgo,
    required this.body,
    required this.likes,
    required this.comments,
    this.scope,
    this.tag,
    this.tagColor,
    this.hasImage = false,
  });

  final String authorInitial;
  final Color authorColor;
  final String authorName;
  final String authorRole;
  final String timeAgo;
  final String body;
  final int likes;
  final int comments;
  final String? scope;
  final String? tag;
  final Color? tagColor;
  final bool hasImage;
}

const _posts = <_BulletinPost>[
  _BulletinPost(
    authorInitial: 'Y',
    authorColor: Color(0xFF115EA3),
    authorName: '山田 健司',
    authorRole: 'CEO',
    timeAgo: '2時間前',
    scope: '全社',
    body:
        '第1四半期のOKR達成、本当にお疲れ様でした。特にHR'
        'プロダクト部の皆さん、ユーザー数が前年比180%に到'
        '達したこと、心から感謝しています。引き続きよろしく'
        'お願いします。',
    likes: 142,
    comments: 18,
  ),
  _BulletinPost(
    authorInitial: 'S',
    authorColor: Color(0xFFC04D4D),
    authorName: '佐藤 由香',
    authorRole: 'シニアUXデザイナー',
    timeAgo: '4時間前',
    tag: 'デザイン',
    tagColor: Color(0xFFE2807B),
    body:
        '新しいデザインシステム "Axis DS 2.0" の全社展開が完'
        '了しました。Figmaライブラリは#design-systemチャン'
        'ネルから参照してください。質問歓迎です。',
    likes: 87,
    comments: 24,
    hasImage: true,
  ),
];

const _filterTabs = <String>[
  'すべて',
  '全社',
  '私の部署',
  'お知らせ',
  'イベント',
  '#design-system',
];

/// ホーム画面の社内掲示板セクション。
/// 共有入力欄 + フィルタタブ + ピン留めバナー + 投稿カード。
class HomeBulletinBoard extends ConsumerWidget {
  const HomeBulletinBoard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // final user = ref.watch(appUserProvider);
    // final initial = (user?.displayName ?? '匠').substring(0, 1);

    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Text(
              '社内掲示板',
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          const FilterTabsRow(tabs: _filterTabs, selectedIndex: 0),
          const SizedBox(height: AppSpacing.sm),
          for (var i = 0; i < _posts.length; i++) ...[
            _PostCard(post: _posts[i], showPinnedBanner: i == 0),
            if (i < _posts.length - 1) const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post, required this.showPinnedBanner});

  final _BulletinPost post;
  final bool showPinnedBanner;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      padding: EdgeInsets.zero,
      margin: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
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
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: const _PostImagePlaceholder(),
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

  final _BulletinPost post;

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

  final _BulletinPost post;

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
        GestureDetector(
          onTap: () => context.push(AppRoutes.announcements),
          child: Text(
            'すべて見る',
            style: AppTextStyles.caption1.copyWith(
              color: AppColors.brand,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
