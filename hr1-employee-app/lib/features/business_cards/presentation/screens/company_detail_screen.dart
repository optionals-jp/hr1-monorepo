import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/company_controller.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 企業詳細画面
class BcCompanyDetailScreen extends ConsumerWidget {
  const BcCompanyDetailScreen({super.key, required this.companyId});

  final String companyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final companyAsync =
        ref.watch(companyDetailControllerProvider(companyId));

    return Scaffold(
      appBar: AppBar(title: const Text('企業詳細')),
      body: companyAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () =>
              ref.invalidate(companyDetailControllerProvider(companyId)),
        ),
        data: (company) {
          if (company == null) {
            return const ErrorState(message: '企業が見つかりません');
          }
          return _Body(companyId: companyId, company: company);
        },
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.companyId, required this.company});

  final String companyId;
  final dynamic company;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactsAsync = ref.watch(bcContactsByCompanyProvider(companyId));
    final dealsAsync = ref.watch(bcDealsByCompanyProvider(companyId));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ヘッダー
          Center(
            child: Column(
              children: [
                OrgIcon(name: company.name, size: 64),
                const SizedBox(height: AppSpacing.sm),
                Text(company.name, style: AppTextStyles.title2),
                if (company.industry != null)
                  Text(
                    company.industry!,
                    style: AppTextStyles.body1.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          // 基本情報
          GroupedSection(
            title: '基本情報',
            children: [
              if (company.corporateNumber != null)
                MenuRow(
                  icon: Icons.tag,
                  label: '法人番号',
                  title: company.corporateNumber!,
                ),
              if (company.phone != null)
                MenuRow(
                  icon: Icons.phone,
                  label: '電話',
                  title: company.phone!,
                ),
              if (company.address != null)
                MenuRow(
                  icon: Icons.location_on,
                  label: '住所',
                  title: company.address!,
                ),
              if (company.website != null)
                MenuRow(
                  icon: Icons.language,
                  label: 'Web',
                  title: company.website!,
                ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // 連絡先
          contactsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (contacts) => _ContactsSection(contacts: contacts),
          ),

          // 商談
          dealsAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (deals) {
              if (deals.isEmpty) return const SizedBox.shrink();
              return _CompanyDealsSection(deals: deals);
            },
          ),

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}

class _ContactsSection extends StatelessWidget {
  const _ContactsSection({required this.contacts});

  final List<BcContact> contacts;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('連絡先（${contacts.length}名）', style: AppTextStyles.headline),
        const SizedBox(height: AppSpacing.xs),
        if (contacts.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            child: Text(
              'この企業の連絡先はまだありません',
              style: AppTextStyles.body1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          )
        else
          ...contacts.map((contact) => CommonCard(
                child: ListTile(
                  leading: UserAvatar(
                    initial: contact.lastName[0],
                    size: 36,
                  ),
                  title: Text(contact.fullName, style: AppTextStyles.body1),
                  subtitle: contact.position != null
                      ? Text(contact.position!,
                          style: AppTextStyles.caption1)
                      : null,
                  onTap: () => context.push(
                    AppRoutes.bcContactDetail,
                    extra: contact.id,
                  ),
                ),
              )),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }
}

class _CompanyDealsSection extends StatelessWidget {
  const _CompanyDealsSection({required this.deals});

  final List<BcDeal> deals;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('商談（${deals.length}件）', style: AppTextStyles.headline),
        const SizedBox(height: AppSpacing.xs),
        ...deals.map((deal) => CommonCard(
              child: ListTile(
                title: Text(deal.title, style: AppTextStyles.body1),
                subtitle: Text(
                  '${deal.status.label} / ${deal.stage.label}',
                  style: AppTextStyles.caption1,
                ),
                onTap: () => context.push(
                  AppRoutes.bcDealDetail,
                  extra: deal.id,
                ),
              ),
            )),
        const SizedBox(height: AppSpacing.md),
      ],
    );
  }
}
