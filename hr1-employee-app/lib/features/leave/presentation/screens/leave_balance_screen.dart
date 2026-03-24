import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/leave/domain/entities/leave_balance.dart';
import 'package:hr1_employee_app/features/leave/presentation/providers/leave_providers.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 有給・休暇管理画面
class LeaveBalanceScreen extends ConsumerWidget {
  const LeaveBalanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balancesAsync = ref.watch(leaveBalancesProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('有給・休暇管理')),
      body: balancesAsync.when(
        data: (balances) => _Body(balances: balances),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(leaveBalancesProvider)),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.sm,
          ),
          child: CommonButton(
            onPressed: () {
              context.push(
                AppRoutes.workflowCreate,
                extra: WorkflowRequestType.paidLeave,
              );
            },
            child: const Text('有給申請する'),
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.balances});

  final List<LeaveBalance> balances;

  @override
  Widget build(BuildContext context) {
    if (balances.isEmpty) {
      return Center(
        child: Text(
          '休暇データがありません',
          style: AppTextStyles.body1.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
      );
    }

    final current = balances.first;
    final pastBalances = balances.length > 1
        ? balances.sublist(1)
        : <LeaveBalance>[];

    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.md,
      ),
      children: [
        _CurrentBalanceCard(balance: current),
        if (pastBalances.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xl),
          _SectionHeader(),
          const SizedBox(height: AppSpacing.sm),
          for (final balance in pastBalances) ...[
            _PastBalanceCard(balance: balance),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
        const SizedBox(height: AppSpacing.xxl),
      ],
    );
  }
}

class _CurrentBalanceCard extends StatelessWidget {
  const _CurrentBalanceCard({required this.balance});

  final LeaveBalance balance;

  @override
  Widget build(BuildContext context) {
    final totalDays = balance.grantedDays + balance.carriedOverDays;
    final progress = totalDays > 0 ? balance.usedDays / totalDays : 0.0;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.border(context)),
        boxShadow: AppShadows.of4(context),
      ),
      child: Column(
        children: [
          Text(
            '${balance.fiscalYear}年度',
            style: AppTextStyles.caption1.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${balance.remainingDays.toStringAsFixed(1)}日',
            style: AppTextStyles.display.copyWith(
              fontWeight: FontWeight.w600,
              color: AppColors.brand,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '残り有給日数',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          ClipRRect(
            borderRadius: AppRadius.radius80,
            child: LinearProgressIndicator(
              value: progress.clamp(0.0, 1.0),
              minHeight: 8,
              backgroundColor: AppColors.brand.withValues(alpha: 0.15),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.brand),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '消化率 ${balance.usageRate.toStringAsFixed(0)}%',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              _StatItem(
                label: '付与日数',
                value: '${balance.grantedDays.toStringAsFixed(1)}日',
              ),
              _VerticalDivider(),
              _StatItem(
                label: '使用日数',
                value: '${balance.usedDays.toStringAsFixed(1)}日',
              ),
              _VerticalDivider(),
              _StatItem(
                label: '繰越日数',
                value: '${balance.carriedOverDays.toStringAsFixed(1)}日',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: AppTextStyles.headline),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}

class _VerticalDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 0.5, height: 28, color: AppColors.border(context));
  }
}

class _SectionHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text(
      '過去の年度',
      style: AppTextStyles.caption2.copyWith(
        color: AppColors.textSecondary(context),
        fontWeight: FontWeight.w600,
        letterSpacing: 0.3,
      ),
    );
  }
}

class _PastBalanceCard extends StatelessWidget {
  const _PastBalanceCard({required this.balance});

  final LeaveBalance balance;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.border(context)),
        boxShadow: AppShadows.of4(context),
      ),
      child: Row(
        children: [
          Text(
            '${balance.fiscalYear}年度',
            style: AppTextStyles.caption1.copyWith(fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          Text(
            '付与 ${balance.grantedDays.toStringAsFixed(1)}',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            '使用 ${balance.usedDays.toStringAsFixed(1)}',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Text(
            '残 ${balance.remainingDays.toStringAsFixed(1)}',
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.brand,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
