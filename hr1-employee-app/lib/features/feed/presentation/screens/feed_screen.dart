import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/shared/widgets/filter_tabs_row.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// フィード画面 — 社内掲示板タブから遷移される。
///
/// 全社のお知らせ・部署の投稿・自分宛のメッセージを時系列でまとめた
/// フィード形式 UI。HomeBulletinBoard よりも充実したコンテンツを表示する。
class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CommonScaffold(
      backgroundColor: AppColors.surface(context),
      appBar: AppBar(
        title: Text(
          'フィード',
          style: AppTextStyles.title2.copyWith(
            color: AppColors.textPrimary(context),
          ),
        ),
        centerTitle: false,
      ),
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
            child: FilterTabsRow(tabs: _filterTabs, selectedIndex: 0),
          ),
          SliverList.separated(
            itemCount: _posts.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, i) =>
                _FeedPostCard(post: _posts[i], showPinnedBanner: i == 0),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
        ],
      ),
    );
  }
}

// ─── Mock data ─────────────────────────────────────────────────────────

class _FeedPost {
  const _FeedPost({
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

const _posts = <_FeedPost>[
  _FeedPost(
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
  _FeedPost(
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
  _FeedPost(
    authorInitial: '人',
    authorColor: Color(0xFF0E7A0B),
    authorName: '人事部',
    authorRole: 'HR Office',
    timeAgo: '昨日',
    scope: '全社',
    tag: '健康',
    tagColor: Color(0xFF0E7A0B),
    body:
        '健康診断の予約受付を開始しました。5月末までに必ず予'
        '約をお願いします。マイページの「健康診断」より受付可'
        '能です。',
    likes: 56,
    comments: 9,
  ),
  _FeedPost(
    authorInitial: 'T',
    authorColor: Color(0xFF8764B8),
    authorName: '田中 真理子',
    authorRole: 'プロダクトマネージャー',
    timeAgo: '昨日',
    tag: 'PM',
    tagColor: Color(0xFF8764B8),
    body:
        'Q2 のロードマップを #pm-team で共有しました。優先順'
        '位については引き続き議論しましょう。来週の sprint '
        'planning までにフィードバックをお願いします。',
    likes: 32,
    comments: 12,
  ),
  _FeedPost(
    authorInitial: 'I',
    authorColor: Color(0xFFBC4B09),
    authorName: '情報システム部',
    authorRole: 'IT Operations',
    timeAgo: '2日前',
    scope: '全社',
    tag: 'IT',
    tagColor: Color(0xFFBC4B09),
    body:
        '4/26（土）22:00〜翌2:00、社内ネットワーク機器の定期'
        'メンテナンスを実施します。VPNが一時的に利用できなく'
        'なります。',
    likes: 18,
    comments: 4,
  ),
  _FeedPost(
    authorInitial: 'K',
    authorColor: Color(0xFF115EA3),
    authorName: '小林 大樹',
    authorRole: 'エンジニアリングマネージャー',
    timeAgo: '3日前',
    tag: '開発',
    tagColor: Color(0xFF115EA3),
    body:
        'モバイルアプリのリリース v3.2 が完了しました。新機'
        '能・改善点はリリースノートをご確認ください。フィード'
        'バックは #mobile-feedback まで。',
    likes: 64,
    comments: 7,
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

// ─── 投稿カード ───────────────────────────────────────────────────────

class _FeedPostCard extends StatelessWidget {
  const _FeedPostCard({required this.post, required this.showPinnedBanner});

  final _FeedPost post;
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
              style: AppTextStyles.body2.copyWith(
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

  final _FeedPost post;

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

  final _FeedPost post;

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
