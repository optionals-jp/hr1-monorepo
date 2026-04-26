import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/feed/presentation/providers/feed_providers.dart';
import 'package:hr1_employee_app/features/feed/presentation/screens/feed_new_sheet.dart';
import 'package:hr1_employee_app/features/feed/presentation/widgets/feed_post_card.dart';
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
    final posts = ref.watch(feedListProvider);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      // 白の surface 背景上にステータスバーが乗るため、アイコン/文字を暗く固定。
      // (Scaffold appBar が無いと OS デフォルトに依存するため明示する)
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: CommonScaffold(
        backgroundColor: AppColors.surface(context),
        floatingActionButton: FloatingActionButton(
          onPressed: () => FeedNewSheet.show(context, ref),
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          elevation: 2,
          child: const Icon(Icons.add_rounded),
        ),
        // SafeArea で body 全体を status bar 下に押し下げる。これで pinned な
        // フィルタータブも自動的に safe area 下に収まる。SliverAppBar の内部
        // safeAreaTop padding は二重カウント防止のため `primary: false` で無効化。
        // 横向き / Dynamic Island 対策として left/right も含む。
        body: SafeArea(
          top: true,
          bottom: false,
          left: true,
          right: true,
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                primary: false,
                title: Text(
                  '社内掲示板',
                  style: AppTextStyles.title1.copyWith(
                    color: AppColors.textPrimary(context),
                  ),
                ),
                centerTitle: false,
                // ヘッダーはスクロールで消える（再度上に戻すと再表示）。
                pinned: false,
                floating: false,
                snap: false,
                backgroundColor: AppColors.surface(context),
                surfaceTintColor: Colors.transparent,
                elevation: 0,
                scrolledUnderElevation: 0,
                automaticallyImplyLeading: false,
              ),
              // フィルタータブは画面上部に固定。SafeArea wrap により
              // status bar 下に正しく止まる。
              const SliverPersistentHeader(
                pinned: true,
                delegate: _PinnedFilterTabsDelegate(),
              ),
              SliverList.separated(
                itemCount: posts.length,
                separatorBuilder: (_, _) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (context, i) {
                  final post = posts[i];
                  return FeedPostCard(
                    post: post,
                    showPinnedBanner: i == 0,
                    onTap: () =>
                        context.push(AppRoutes.feedDetail, extra: post.id),
                  );
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
            ],
          ),
        ),
      ),
    );
  }
}

/// フィルタータブを画面上部に pinned で固定するための delegate。
/// 背景は不透明な surface 色にして、スクロールで下に流れる投稿カードが
/// 透けて見えないようにする。下端に薄い divider を入れて視覚的な区切りも付ける。
class _PinnedFilterTabsDelegate extends SliverPersistentHeaderDelegate {
  const _PinnedFilterTabsDelegate();

  static const double _bottomPadding = 8;
  static const double _filterTabHeight = 32;
  // padding は bottom のみなので tab 高さ + bottom padding が pinned 高さ。
  static const double _height = _filterTabHeight + _bottomPadding;

  @override
  double get maxExtent => _height;

  @override
  double get minExtent => _height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        border: Border(
          bottom: BorderSide(color: AppColors.divider(context), width: 0.5),
        ),
      ),
      padding: const EdgeInsets.only(bottom: _bottomPadding),
      child: const FilterTabsRow(tabs: _filterTabs, selectedIndex: 0),
    );
  }

  @override
  bool shouldRebuild(covariant _PinnedFilterTabsDelegate oldDelegate) => false;
}

const _filterTabs = <String>[
  'すべて',
  '全社',
  '私の部署',
  'お知らせ',
  'イベント',
  '#design-system',
];
