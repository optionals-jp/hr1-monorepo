import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/company_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// CRM 企業検索画面（タブ5に配置）
class CrmScreen extends HookConsumerWidget {
  const CrmScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companiesAsync = ref.watch(companyListControllerProvider);
    final searchCtl = useTextEditingController();
    final debounceTimer = useRef<Timer?>(null);

    void onSearch(String query) {
      debounceTimer.value?.cancel();
      debounceTimer.value = Timer(const Duration(milliseconds: 300), () {
        ref.read(companyListControllerProvider.notifier).search(query);
      });
    }

    final user = ref.watch(appUserProvider);

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            Text(
              '取引先',
              style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.person_add),
            onPressed: () => context.push(AppRoutes.bcContactForm),
            tooltip: '連絡先を登録',
          ),
          IconButton(
            icon: const Icon(Icons.camera_alt),
            onPressed: () => context.push(AppRoutes.bcScan),
            tooltip: '名刺スキャン',
          ),
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // 検索バー
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
              ),
              child: SearchBox(
                controller: searchCtl,
                hintText: '企業名で検索',
                onChanged: onSearch,
              ),
            ),
          ),

          // クイックアクション
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.md,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.contacts,
                      label: '連絡先',
                      onTap: () => context.push(AppRoutes.bcContacts),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: _QuickAction(
                      icon: Icons.handshake,
                      label: '商談',
                      onTap: () => context.push(AppRoutes.bcDeals),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // セクションタイトル
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.xs,
              ),
              child: Text('企業一覧', style: AppTextStyles.headline),
            ),
          ),

          // 企業リスト
          companiesAsync.when(
            loading: () => const SliverFillRemaining(child: LoadingIndicator()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                onRetry: () => ref.invalidate(companyListControllerProvider),
              ),
            ),
            data: (companies) {
              if (companies.isEmpty) {
                return SliverFillRemaining(
                  child: EmptyState(
                    icon: Icon(
                      Icons.business,
                      size: 48,
                      color: AppColors.textTertiary(context),
                    ),
                    title: '企業がありません',
                    description: '名刺をスキャンまたは手動で連絡先を登録すると企業が追加されます',
                  ),
                );
              }
              return SliverPadding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                ),
                sliver: SliverList.builder(
                  itemCount: companies.length,
                  itemBuilder: (context, index) =>
                      _CompanyCard(company: companies[index]),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.radius120,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            vertical: AppSpacing.md,
            horizontal: AppSpacing.sm,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: AppColors.brand),
              const SizedBox(width: AppSpacing.xs),
              Text(label, style: AppTextStyles.body1),
            ],
          ),
        ),
      ),
    );
  }
}

class _CompanyCard extends StatelessWidget {
  const _CompanyCard({required this.company});

  final BcCompany company;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: ListTile(
        leading: OrgIcon(
          initial: company.name.isNotEmpty ? company.name[0] : '?',
          size: 40,
        ),
        title: Text(company.name, style: AppTextStyles.body1),
        subtitle: Text(
          [
            if (company.industry != null) company.industry,
            if (company.address != null) company.address,
          ].join(' / '),
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.textSecondary(context),
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: AppColors.textTertiary(context),
        ),
        onTap: () => context.push(AppRoutes.bcCompanyDetail, extra: company.id),
      ),
    );
  }
}
