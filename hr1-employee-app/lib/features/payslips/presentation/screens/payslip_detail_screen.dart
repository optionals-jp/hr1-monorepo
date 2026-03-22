import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/payslips/domain/entities/payslip.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 給与明細詳細画面
class PayslipDetailScreen extends StatelessWidget {
  const PayslipDetailScreen({super.key, required this.payslip});

  final Payslip payslip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CommonScaffold(
      appBar: AppBar(title: Text(payslip.monthLabel)),
      body: ListView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.md,
        ),
        children: [
          // 支給額セクション
          _SectionCard(
            children: [
              const _SectionHeader(title: '支給額'),
              const SizedBox(height: AppSpacing.sm),
              DetailRow(
                label: '基本給',
                value: _formatCurrency(payslip.baseSalary),
              ),
              ...payslip.allowances.map(
                (item) => DetailRow(
                  label: item.label,
                  value: _formatCurrency(item.amount),
                ),
              ),
              const Divider(height: AppSpacing.lg),
              DetailRow(
                label: '支給合計',
                value: _formatCurrency(payslip.grossPay),
                valueStyle: AppTextStyles.body2.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // 控除額セクション
          _SectionCard(
            children: [
              const _SectionHeader(title: '控除額'),
              const SizedBox(height: AppSpacing.sm),
              ...payslip.deductions.map(
                (item) => DetailRow(
                  label: item.label,
                  value: _formatCurrency(item.amount),
                ),
              ),
              const Divider(height: AppSpacing.lg),
              DetailRow(
                label: '控除合計',
                value: _formatCurrency(payslip.totalDeductions),
                valueStyle: AppTextStyles.body2.copyWith(
                  color: theme.colorScheme.onSurface,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // 差引支給額セクション
          _SectionCard(
            children: [
              const _SectionHeader(title: '差引支給額'),
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: Text(
                  _formatCurrency(payslip.netPay),
                  style: AppTextStyles.title1.copyWith(
                    color: AppColors.brandPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),

          // 備考
          if (payslip.note != null && payslip.note!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            _SectionCard(
              children: [
                const _SectionHeader(title: '備考'),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  payslip.note!,
                  style: AppTextStyles.body2.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}

/// セクションカード
class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: AppRadius.radius120,
        border: Border.all(
          color: AppColors.border(theme.brightness),
          width: AppStroke.strokeWidth05,
        ),
        boxShadow: AppShadows.shadow4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

/// セクションヘッダー
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      title,
      style: AppTextStyles.caption2.copyWith(
        color: AppColors.textSecondary(theme.brightness),
        fontWeight: FontWeight.w600,
        letterSpacing: 0.3,
      ),
    );
  }
}

String _formatCurrency(int amount) {
  final formatted = amount.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]},',
  );
  return '¥$formatted';
}
