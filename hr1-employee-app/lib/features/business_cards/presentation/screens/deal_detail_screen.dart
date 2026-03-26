import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/deal_controller.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 商談詳細画面
class BcDealDetailScreen extends ConsumerWidget {
  const BcDealDetailScreen({super.key, required this.dealId});

  final String dealId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dealAsync = ref.watch(dealDetailControllerProvider(dealId));

    return Scaffold(
      appBar: AppBar(title: const Text('商談詳細')),
      body: dealAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(dealDetailControllerProvider(dealId)),
        ),
        data: (deal) {
          if (deal == null) {
            return const ErrorState(message: '商談が見つかりません');
          }
          return _Body(dealId: dealId, deal: deal);
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push(
          AppRoutes.bcActivityForm,
          extra: {'dealId': dealId, 'type': 'memo'},
        ),
        child: const Icon(Icons.note_add),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.dealId, required this.deal});

  final String dealId;
  final dynamic deal;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activitiesAsync = ref.watch(bcActivitiesByDealProvider(dealId));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(deal.title, style: AppTextStyles.title2),
          const SizedBox(height: AppSpacing.md),

          // ステータス・ステージ
          Row(
            children: [
              _StatusChip(label: deal.status.label, status: deal.status.name),
              const SizedBox(width: AppSpacing.sm),
              _StageChip(label: deal.stage.label),
            ],
          ),

          const SizedBox(height: AppSpacing.lg),

          GroupedSection(
            title: '基本情報',
            children: [
              if (deal.company != null)
                MenuRow(
                  icon: const Icon(Icons.business),
                  label: '企業',
                  title: deal.company!.name,
                  onTap: () => context.push(
                    AppRoutes.bcCompanyDetail,
                    extra: deal.companyId,
                  ),
                ),
              if (deal.contact != null)
                MenuRow(
                  icon: const Icon(Icons.person),
                  label: '連絡先',
                  title: deal.contact!.fullName,
                  onTap: () => context.push(
                    AppRoutes.bcContactDetail,
                    extra: deal.contactId,
                  ),
                ),
              if (deal.amount != null)
                MenuRow(
                  icon: const Icon(Icons.attach_money),
                  label: '金額',
                  title: '¥${_formatAmount(deal.amount!)}',
                ),
              if (deal.expectedCloseDate != null)
                MenuRow(
                  icon: const Icon(Icons.calendar_today),
                  label: '見込み日',
                  title:
                      '${deal.expectedCloseDate!.year}/${deal.expectedCloseDate!.month}/${deal.expectedCloseDate!.day}',
                ),
              if (deal.description != null && deal.description!.isNotEmpty)
                MenuRow(
                  icon: const Icon(Icons.description),
                  label: '説明',
                  title: deal.description!,
                ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // 活動履歴
          activitiesAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (activities) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '活動履歴（${activities.length}件）',
                    style: AppTextStyles.headline,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  if (activities.isEmpty)
                    Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Text(
                        'まだ活動記録がありません',
                        style: AppTextStyles.body1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                    )
                  else
                    ...activities.map((a) => _ActivityTile(activity: a)),
                ],
              );
            },
          ),

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }

  String _formatAmount(int amount) {
    return amount.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.status});

  final String label;
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'open' => AppColors.brand,
      'won' => AppColors.success,
      'lost' => AppColors.error,
      _ => AppColors.brand,
    };
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.cornerRadius80),
      ),
      child: Text(label, style: AppTextStyles.caption1.copyWith(color: color)),
    );
  }
}

class _StageChip extends StatelessWidget {
  const _StageChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.textTertiary(context)),
        borderRadius: BorderRadius.circular(AppRadius.cornerRadius80),
      ),
      child: Text(label, style: AppTextStyles.caption1),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({required this.activity});

  final BcActivity activity;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: ListTile(
        leading: Icon(switch (activity.activityType) {
          ActivityType.appointment => Icons.event,
          ActivityType.memo => Icons.note,
          ActivityType.call => Icons.phone,
          ActivityType.email => Icons.email,
          ActivityType.visit => Icons.directions_walk,
        }, color: AppColors.brand),
        title: Text(activity.title, style: AppTextStyles.body1),
        subtitle: Text(
          activity.activityType.label,
          style: AppTextStyles.caption1,
        ),
      ),
    );
  }
}
