import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/company_controller.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 企業一覧画面
class BcCompaniesScreen extends HookConsumerWidget {
  const BcCompaniesScreen({super.key});

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

    return Scaffold(
      appBar: AppBar(
        title: const Text('取引先企業'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: SearchBox(
              controller: searchCtl,
              hintText: '企業名で検索',
              onChanged: onSearch,
            ),
          ),
          Expanded(
            child: companiesAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorState(
                onRetry: () =>
                    ref.invalidate(companyListControllerProvider),
              ),
              data: (companies) {
                if (companies.isEmpty) {
                  return const EmptyState(
                    icon: Icons.business,
                    title: '企業がありません',
                    subtitle: '名刺をスキャンすると自動で企業が登録されます',
                  );
                }
                return ListView.builder(
                  itemCount: companies.length,
                  itemBuilder: (context, index) =>
                      _CompanyTile(company: companies[index]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CompanyTile extends StatelessWidget {
  const _CompanyTile({required this.company});

  final BcCompany company;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: OrgIcon(
        name: company.name,
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
      onTap: () => context.push(
        AppRoutes.bcCompanyDetail,
        extra: company.id,
      ),
    );
  }
}
