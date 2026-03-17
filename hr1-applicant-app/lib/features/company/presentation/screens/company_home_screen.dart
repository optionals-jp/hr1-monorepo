import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../auth/domain/entities/organization.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../../applications/presentation/providers/applications_providers.dart';
import '../../domain/entities/company_page_config.dart';
import '../providers/company_page_providers.dart';
import '../widgets/section_renderers.dart';

/// 企業プロフィール画面（ホームタブ）
/// CompanyPageConfig に基づいてデータ駆動で描画
class CompanyHomeScreen extends ConsumerWidget {
  const CompanyHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final asyncConfig = ref.watch(companyPageConfigProvider);

    if (currentOrg == null) {
      return const Center(child: Text('企業が選択されていません'));
    }

    return asyncConfig.when(
      data: (config) {
        if (config == null || config.tabs.isEmpty) {
          return Center(
            child: Text('ページが設定されていません',
                style: AppTextStyles.bodySmall.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                )),
          );
        }

        return _CompanyPageBody(org: currentOrg, config: config);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => const Center(child: Text('エラーが発生しました')),
    );
  }
}

class _CompanyPageBody extends ConsumerStatefulWidget {
  const _CompanyPageBody({required this.org, required this.config});
  final Organization org;
  final CompanyPageConfig config;

  @override
  ConsumerState<_CompanyPageBody> createState() => _CompanyPageBodyState();
}

class _CompanyPageBodyState extends ConsumerState<_CompanyPageBody>
    with TickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.config.tabs.length,
      vsync: this,
    );
  }

  @override
  void didUpdateWidget(covariant _CompanyPageBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 企業切替時にタブ数が変わったらコントローラーを再生成
    if (oldWidget.config.tabs.length != widget.config.tabs.length) {
      _tabController.dispose();
      _tabController = TabController(
        length: widget.config.tabs.length,
        vsync: this,
      );
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) {
        return [
          // プロフィールヘッダー
          SliverToBoxAdapter(
            child: _ProfileHeader(org: widget.org),
          ),
          // タブバー
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              tabController: _tabController,
              tabs: widget.config.tabs.map((t) => t.label).toList(),
            ),
          ),
        ];
      },
      body: TabBarView(
        controller: _tabController,
        children: widget.config.tabs.map((tab) {
          return _TabContent(tab: tab);
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// タブコンテンツ: セクションを順番に描画
// ---------------------------------------------------------------------------

class _TabContent extends StatelessWidget {
  const _TabContent({required this.tab});
  final PageTab tab;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: tab.sections.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.xl),
      itemBuilder: (context, index) {
        return SectionRenderer(section: tab.sections[index]);
      },
    );
  }
}

// ---------------------------------------------------------------------------
// プロフィールヘッダー
// ---------------------------------------------------------------------------

class _ProfileHeader extends ConsumerWidget {
  const _ProfileHeader({required this.org});
  final Organization org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Container(
      color: theme.colorScheme.surface,
      child: Column(
        children: [
          // カバー
          Container(
            height: 100,
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primary,
                  AppColors.primaryLight,
                ],
              ),
            ),
          ),
          // アバター + 情報
          Transform.translate(
            offset: const Offset(0, -32),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // アバター
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border:
                          Border.all(color: theme.colorScheme.surface, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.08),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Container(
                        color: theme.colorScheme.primary.withValues(alpha: 0.08),
                        child: Center(
                          child: Text(
                            org.name.characters.first,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(org.name, style: AppTextStyles.heading3),
                  const SizedBox(height: AppSpacing.xs),
                  // 業種 + 所在地
                  Row(
                    children: [
                      if (org.industry != null) ...[
                        _InlineTag(org.industry!),
                        const SizedBox(width: AppSpacing.sm),
                      ],
                      if (org.location != null)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.location_on_outlined,
                                size: 14, color: theme.colorScheme.onSurfaceVariant),
                            const SizedBox(width: 2),
                            Text(org.location!,
                                style: AppTextStyles.caption.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                )),
                          ],
                        ),
                    ],
                  ),
                  // ミッション
                  if (org.mission != null) ...[
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      org.mission!,
                      style: AppTextStyles.body.copyWith(height: 1.5),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.lg),
                  // 統計バー
                  _StatsBar(org: org),
                  const SizedBox(height: AppSpacing.md),
                  // FAQ & サーベイ ボタン
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push(AppRoutes.faq),
                          icon: const Icon(Icons.help_outline_rounded, size: 18),
                          label: const Text('FAQ'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primaryLight,
                            side: BorderSide(
                              color: AppColors.primaryLight.withValues(alpha: 0.3),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => context.push(AppRoutes.surveys),
                          icon: const Icon(Icons.poll_outlined, size: 18),
                          label: const Text('サーベイ'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primaryLight,
                            side: BorderSide(
                              color: AppColors.primaryLight.withValues(alpha: 0.3),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineTag extends StatelessWidget {
  const _InlineTag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.primaryLight.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: AppTextStyles.caption.copyWith(
          color: AppColors.primaryLight,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _StatsBar extends ConsumerWidget {
  const _StatsBar({required this.org});
  final Organization org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobCount = ref.watch(jobsProvider).valueOrNull?.length ?? 0;
    return Row(
      children: [
        _StatCell(
          value: org.foundedYear?.toString() ?? '-',
          label: '設立',
        ),
        _Divider(),
        _StatCell(
          value: org.employeeCount ?? '-',
          label: '従業員',
        ),
        _Divider(),
        _StatCell(
          value: '$jobCount件',
          label: '募集中',
        ),
      ],
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: AppTextStyles.subtitle.copyWith(
              fontSize: 15,
              color: theme.colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 2),
          Text(label, style: AppTextStyles.caption.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          )),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 28, color: Theme.of(context).dividerColor);
  }
}

// ---------------------------------------------------------------------------
// タブバー Delegate
// ---------------------------------------------------------------------------

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarDelegate({
    required this.tabController,
    required this.tabs,
  });

  final TabController tabController;
  final List<String> tabs;

  @override
  double get minExtent => 48;

  @override
  double get maxExtent => 48;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);
    return Container(
      color: theme.colorScheme.surface,
      child: Column(
        children: [
          TabBar(
            controller: tabController,
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
            labelStyle: AppTextStyles.subtitle.copyWith(fontSize: 14),
            unselectedLabelStyle: AppTextStyles.body.copyWith(fontSize: 14),
            indicatorColor: theme.colorScheme.primary,
            indicatorWeight: 2.5,
            indicatorSize: TabBarIndicatorSize.label,
            dividerHeight: 0,
            isScrollable: tabs.length > 4,
            tabs: tabs.map((t) => Tab(text: t, height: 44)).toList(),
          ),
          Container(height: 0.5, color: theme.dividerColor),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) =>
      tabs != oldDelegate.tabs;
}
