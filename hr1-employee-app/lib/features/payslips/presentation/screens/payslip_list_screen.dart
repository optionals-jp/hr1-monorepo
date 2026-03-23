import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/payslips/domain/entities/payslip.dart';
import 'package:hr1_employee_app/features/payslips/presentation/providers/payslip_providers.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 給与明細一覧画面
class PayslipListScreen extends ConsumerWidget {
  const PayslipListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedYear = ref.watch(selectedYearProvider);
    final payslipsAsync = ref.watch(payslipsByYearProvider(selectedYear));
    final yearsAsync = ref.watch(payslipAvailableYearsProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('給与明細')),
      body: Column(
        children: [
          // 年セレクター
          _YearSelector(
            selectedYear: selectedYear,
            availableYears: yearsAsync.valueOrNull,
            onYearChanged: (year) {
              ref.read(selectedYearProvider.notifier).setYear(year);
            },
          ),

          // コンテンツ
          Expanded(
            child: payslipsAsync.when(
              data: (payslips) => _Body(payslips: payslips),
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorState(
                onRetry: () =>
                    ref.invalidate(payslipsByYearProvider(selectedYear)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 年セレクター
class _YearSelector extends StatelessWidget {
  const _YearSelector({
    required this.selectedYear,
    required this.availableYears,
    required this.onYearChanged,
  });

  final int selectedYear;
  final List<int>? availableYears;
  final ValueChanged<int> onYearChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currentYear = DateTime.now().year;
    final years = availableYears ?? [currentYear];
    final displayYears = years.contains(currentYear)
        ? years
        : [currentYear, ...years];

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.sm,
      ),
      child: SizedBox(
        height: 36,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: displayYears.length,
          separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
          itemBuilder: (context, index) {
            final year = displayYears[index];
            final isSelected = year == selectedYear;
            return ChoiceChip(
              label: Text('$year年'),
              selected: isSelected,
              onSelected: (_) => onYearChanged(year),
              labelStyle: AppTextStyles.caption1.copyWith(
                color: isSelected
                    ? theme.colorScheme.onPrimary
                    : theme.colorScheme.onSurface,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              ),
              selectedColor: AppColors.brand,
              backgroundColor: theme.colorScheme.surface,
              side: BorderSide(
                color: isSelected
                    ? AppColors.brand
                    : theme.colorScheme.outlineVariant,
              ),
              visualDensity: VisualDensity.compact,
            );
          },
        ),
      ),
    );
  }
}

/// 給与明細一覧ボディ
class _Body extends StatelessWidget {
  const _Body({required this.payslips});

  final List<Payslip> payslips;

  @override
  Widget build(BuildContext context) {
    if (payslips.isEmpty) {
      return EmptyState(
        icon: Icon(
          Icons.receipt_long,
          size: 48,
          color: AppColors.textTertiary(Theme.of(context).brightness),
        ),
        title: '給与明細がありません',
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.md,
      ),
      itemCount: payslips.length,
      itemBuilder: (context, index) {
        final payslip = payslips[index];
        return _PayslipCard(payslip: payslip);
      },
    );
  }
}

/// 給与明細カード
class _PayslipCard extends StatelessWidget {
  const _PayslipCard({required this.payslip});

  final Payslip payslip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Material(
        color: theme.colorScheme.surface,
        borderRadius: AppRadius.radius120,
        child: InkWell(
          onTap: () {
            context.push(AppRoutes.payslipDetail, extra: payslip);
          },
          borderRadius: AppRadius.radius120,
          child: Container(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            decoration: BoxDecoration(
              borderRadius: AppRadius.radius120,
              border: Border.all(
                color: theme.dividerColor,
                width: AppStroke.strokeWidth05,
              ),
              boxShadow: AppShadows.shadow4,
            ),
            child: Row(
              children: [
                // 月表示
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.brand.withValues(alpha: 0.1),
                    borderRadius: AppRadius.radius80,
                  ),
                  child: Center(
                    child: Text(
                      '${payslip.month}月',
                      style: AppTextStyles.headline.copyWith(
                        color: AppColors.brand,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),

                // 差引支給額
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${payslip.year}年${payslip.month}月',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatCurrency(payslip.netPay),
                        style: AppTextStyles.headline.copyWith(
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),

                // 矢印
                Icon(
                  Icons.chevron_right,
                  size: 20,
                  color: AppColors.textTertiary(theme.brightness),
                ),
              ],
            ),
          ),
        ),
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
