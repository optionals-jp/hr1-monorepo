import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/deal_controller.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 商談一覧画面
class BcDealsScreen extends ConsumerWidget {
  const BcDealsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dealsAsync = ref.watch(dealListControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('商談'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => context.push(AppRoutes.bcDealForm),
          ),
        ],
      ),
      body: dealsAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(dealListControllerProvider),
        ),
        data: (deals) {
          if (deals.isEmpty) {
            return const EmptyState(
              icon: Icons.handshake,
              title: '商談がありません',
              subtitle: '新しい商談を追加しましょう',
            );
          }
          return _DealsList(deals: deals);
        },
      ),
    );
  }
}

class _DealsList extends StatelessWidget {
  const _DealsList({required this.deals});

  final List<BcDeal> deals;

  @override
  Widget build(BuildContext context) {
    // ステータス別にグループ化
    final openDeals =
        deals.where((d) => d.status == DealStatus.open).toList();
    final wonDeals =
        deals.where((d) => d.status == DealStatus.won).toList();
    final lostDeals =
        deals.where((d) => d.status == DealStatus.lost).toList();

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.sm),
      children: [
        if (openDeals.isNotEmpty) ...[
          _SectionTitle(
            title: '商談中（${openDeals.length}件）',
            color: AppColors.brand,
          ),
          ...openDeals.map((d) => _DealCard(deal: d)),
          const SizedBox(height: AppSpacing.md),
        ],
        if (wonDeals.isNotEmpty) ...[
          _SectionTitle(
            title: '受注（${wonDeals.length}件）',
            color: AppColors.success,
          ),
          ...wonDeals.map((d) => _DealCard(deal: d)),
          const SizedBox(height: AppSpacing.md),
        ],
        if (lostDeals.isNotEmpty) ...[
          _SectionTitle(
            title: '失注（${lostDeals.length}件）',
            color: AppColors.error,
          ),
          ...lostDeals.map((d) => _DealCard(deal: d)),
        ],
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.color});

  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: AppSpacing.xs,
        horizontal: AppSpacing.xs,
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(title, style: AppTextStyles.headline),
        ],
      ),
    );
  }
}

class _DealCard extends StatelessWidget {
  const _DealCard({required this.deal});

  final BcDeal deal;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      child: ListTile(
        title: Text(deal.title, style: AppTextStyles.body1),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (deal.company != null)
              Text(
                deal.company!.name,
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            Text(
              deal.stage.label,
              style: AppTextStyles.caption1,
            ),
          ],
        ),
        trailing: deal.amount != null
            ? Text(
                '¥${_formatAmount(deal.amount!)}',
                style: AppTextStyles.body1,
              )
            : null,
        onTap: () => context.push(
          AppRoutes.bcDealDetail,
          extra: deal.id,
        ),
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
