import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/organization.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/company/domain/entities/company_page_config.dart';
import 'package:hr1_applicant_app/features/company/presentation/providers/company_page_providers.dart';
import 'package:hr1_applicant_app/features/company/presentation/widgets/section_renderers.dart';

/// 企業プロフィール画面（ホームタブ）
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
          return _NoConfigState(org: currentOrg);
        }
        return _Body(org: currentOrg, config: config);
      },
      loading: () => const LoadingIndicator(),
      error: (e, _) =>
          ErrorState(onRetry: () => ref.invalidate(companyPageConfigProvider)),
    );
  }
}

// =============================================================================
// No Config State
// =============================================================================

class _NoConfigState extends StatelessWidget {
  const _NoConfigState({required this.org});
  final Organization org;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _ProfileHeader(org: org)),
        SliverFillRemaining(
          hasScrollBody: false,
          child: Center(
            child: Text(
              'ページが設定されていません',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// Body
// =============================================================================

class _Body extends HookConsumerWidget {
  const _Body({required this.org, required this.config});
  final Organization org;
  final CompanyPageConfig config;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabController = useTabController(
      initialLength: config.tabs.length,
      keys: [config.tabs.length],
    );

    return NestedScrollView(
      headerSliverBuilder: (context, innerBoxIsScrolled) {
        return [
          SliverToBoxAdapter(child: _ProfileHeader(org: org)),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              tabController: tabController,
              tabs: config.tabs.map((t) => t.label).toList(),
            ),
          ),
        ];
      },
      body: TabBarView(
        controller: tabController,
        children: config.tabs.map((tab) {
          return _TabContent(tab: tab);
        }).toList(),
      ),
    );
  }
}

// =============================================================================
// Tab Content
// =============================================================================

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

// =============================================================================
// Profile Header
// =============================================================================

class _ProfileHeader extends ConsumerWidget {
  const _ProfileHeader({required this.org});
  final Organization org;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final jobCount = ref.watch(jobsProvider).valueOrNull?.length ?? 0;

    return Column(
      children: [
        // カバー + アバター
        Stack(
          clipBehavior: Clip.none,
          children: [
            // グラデーションカバー
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.brandSecondary,
                    AppColors.brand,
                    AppColors.brandLight.withValues(alpha: 0.7),
                  ],
                ),
              ),
            ),
            // アバター（カバーにオーバーラップ）
            Positioned(
              left: AppSpacing.screenHorizontal,
              bottom: -36,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: AppRadius.radius160,
                  border: Border.all(
                    color: theme.colorScheme.surface,
                    width: 3,
                  ),
                  boxShadow: AppShadows.shadow4,
                ),
                child: OrgIcon(
                  initial: org.name.characters.first,
                  size: 72,
                  borderRadius: 15,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 44),

        // 企業情報
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 企業名
              Text(org.name, style: AppTextStyles.title3),
              const SizedBox(height: 6),

              // 業種 + 所在地
              Row(
                children: [
                  if (org.industry != null) ...[
                    Text(
                      org.industry!,
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondary(theme.brightness),
                      ),
                    ),
                    if (org.location != null)
                      Text(
                        ' · ',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                  ],
                  if (org.location != null)
                    Text(
                      org.location!,
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondary(theme.brightness),
                      ),
                    ),
                ],
              ),

              // ミッション
              if (org.mission != null) ...[
                const SizedBox(height: 12),
                Text(
                  org.mission!,
                  style: AppTextStyles.body2.copyWith(height: 1.5),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],

              const SizedBox(height: 16),

              // 統計バー
              Row(
                children: [
                  _StatPill(
                    value: org.foundedYear?.toString() ?? '-',
                    label: '設立',
                  ),
                  const SizedBox(width: 8),
                  _StatPill(value: org.employeeCount ?? '-', label: '従業員'),
                  const SizedBox(width: 8),
                  _StatPill(
                    value: '$jobCount件',
                    label: '募集中',
                    highlighted: jobCount > 0,
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // アクションボタン
              Row(
                children: [
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.help_outline_rounded,
                      label: 'FAQ',
                      onTap: () => context.push(AppRoutes.faq),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _ActionButton(
                      icon: Icons.poll_outlined,
                      label: 'サーベイ',
                      onTap: () => context.push(AppRoutes.surveys),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ],
    );
  }
}

// =============================================================================
// Stat Pill
// =============================================================================

class _StatPill extends StatelessWidget {
  const _StatPill({
    required this.value,
    required this.label,
    this.highlighted = false,
  });
  final String value;
  final String label;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: highlighted
            ? AppColors.brand.withValues(alpha: 0.08)
            : AppColors.surfaceTertiary(theme.brightness),
        borderRadius: AppRadius.radius80,
      ),
      child: Column(
        children: [
          Text(
            value,
            style: AppTextStyles.body2.copyWith(
              fontWeight: FontWeight.w700,
              color: highlighted ? AppColors.brand : null,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(theme.brightness),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Action Button
// =============================================================================

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.divider(theme.brightness)),
          borderRadius: AppRadius.radius80,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: AppColors.textSecondary(theme.brightness),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// Tab Bar Delegate
// =============================================================================

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarDelegate({required this.tabController, required this.tabs});

  final TabController tabController;
  final List<String> tabs;

  @override
  double get minExtent => 48;

  @override
  double get maxExtent => 48;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.surface,
      child: TabBar(
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        controller: tabController,
        labelColor: theme.colorScheme.primary,
        unselectedLabelColor: AppColors.textSecondary(theme.brightness),
        labelStyle: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: AppTextStyles.body2,
        indicatorColor: theme.colorScheme.primary,
        indicatorWeight: 2.5,
        indicatorSize: TabBarIndicatorSize.label,
        tabs: tabs.map((t) => Tab(text: t)).toList(),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) =>
      tabs != oldDelegate.tabs;
}
