import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// KPI を表示する小さなタイル。タスク画面などで横並びに 3 枚配置する想定。
///
/// - 値（大きな数字）を表示する: デフォルトコンストラクタ
///   ```dart
///   KpiTile(label: '超過', value: '$overdue', valueColor: AppColors.danger)
///   ```
/// - アイコン + アクションラベル + タップ可能: [KpiTile.action]
///   ```dart
///   KpiTile.action(
///     label: 'カレンダー',
///     actionText: '月表示 ›',
///     actionIcon: Icons.calendar_month_rounded,
///     onTap: () => context.push(AppRoutes.taskCalendar),
///   )
///   ```
class KpiTile extends StatelessWidget {
  const KpiTile({
    super.key,
    required this.label,
    required String this.value,
    this.valueColor,
  }) : actionText = null,
       actionIcon = null,
       actionColor = null,
       onTap = null;

  const KpiTile.action({
    super.key,
    required this.label,
    required String this.actionText,
    required IconData this.actionIcon,
    required VoidCallback this.onTap,
    this.actionColor,
  }) : value = null,
       valueColor = null;

  final String label;
  final String? value;
  final Color? valueColor;
  final String? actionText;
  final IconData? actionIcon;
  final Color? actionColor;
  final VoidCallback? onTap;

  static const double _radius = 12;
  static const EdgeInsets _padding = EdgeInsets.symmetric(
    horizontal: AppSpacing.md,
    vertical: AppSpacing.sm + 2,
  );

  @override
  Widget build(BuildContext context) {
    final decoration = BoxDecoration(
      color: AppColors.surface(context),
      border: Border.all(color: AppColors.border(context)),
      borderRadius: BorderRadius.circular(_radius),
      boxShadow: AppShadows.of2(context),
    );
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        if (value != null)
          Text(
            value!,
            style: AppTextStyles.title2.copyWith(
              color: valueColor ?? AppColors.textPrimary(context),
              height: 1,
            ),
          )
        else
          Row(
            children: [
              Icon(actionIcon, size: 20, color: AppColors.textPrimary(context)),
              const SizedBox(width: 6),
              Text(
                actionText!,
                style: AppTextStyles.caption1.copyWith(
                  fontWeight: FontWeight.w600,
                  color: actionColor ?? AppColors.brand,
                ),
              ),
            ],
          ),
      ],
    );

    if (onTap == null) {
      return Container(
        padding: _padding,
        decoration: decoration,
        child: content,
      );
    }
    return DecoratedBox(
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(_radius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(_radius),
          child: Padding(padding: _padding, child: content),
        ),
      ),
    );
  }
}
