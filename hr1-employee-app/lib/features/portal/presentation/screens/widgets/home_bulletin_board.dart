import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/feed/presentation/providers/feed_providers.dart';
import 'package:hr1_employee_app/features/feed/presentation/widgets/feed_post_card.dart';
import 'package:hr1_employee_app/shared/widgets/filter_tabs_row.dart';
import 'package:hr1_shared/hr1_shared.dart';

const _filterTabs = <String>[
  'すべて',
  '全社',
  '私の部署',
  'お知らせ',
  'イベント',
  '#design-system',
];

/// ホームに表示する投稿件数。フィードの先頭 N 件を抜粋する。
const _maxPostsToShow = 2;

/// ホーム画面の社内掲示板セクション。フィルタタブ + フィード先頭 [_maxPostsToShow]
/// 件の投稿カードを表示。投稿タップで `feedDetail` 画面に遷移する。
///
/// 投稿データはフィード画面と共通の `feedListProvider` から取得し、
/// `FeedPostCard` を再利用して表示・遷移ロジックも一致させる。
class HomeBulletinBoard extends ConsumerWidget {
  const HomeBulletinBoard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allPosts = ref.watch(feedListProvider);
    final posts = allPosts.take(_maxPostsToShow).toList();

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
          for (var i = 0; i < posts.length; i++) ...[
            FeedPostCard(
              post: posts[i],
              showPinnedBanner: i == 0,
              onTap: () =>
                  context.push(AppRoutes.feedDetail, extra: posts[i].id),
            ),
            if (i < posts.length - 1) const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}
