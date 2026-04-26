import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

import '../../domain/entities/ai_card.dart';

/// 残業時間サマリカード Widget。
///
/// 全体を薄いグレー + 細枠のインナーカードに収める:
/// - 上段: 「今週の残業」「月間上限まで」を 2 列表示。数字は単位（h）と
///   分離し、letterSpacing をタイトに調整して欧文書体らしく
/// - 中段: 月〜金の縦バーグラフ（今日列を強調）
/// - 下段: 先週比 / 今月累計の小キャプション（細い divider で区切る）
class OvertimeSummaryCardView extends StatelessWidget {
  const OvertimeSummaryCardView({super.key, required this.data});

  final OvertimeSummaryCardData data;

  @override
  Widget build(BuildContext context) {
    return _StatsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: _BigStat(
                  caption: '今週の残業',
                  valueText: _format(data.weeklyHours),
                  unitText: 'h',
                  valueColor: AppColors.textPrimary(context),
                ),
              ),
              Container(width: 1, height: 36, color: AppColors.border(context)),
              Expanded(
                child: _BigStat(
                  caption: '月間上限まで',
                  valueText: _format(data.monthlyRemainingHours),
                  unitText: 'h',
                  prefixText: '残',
                  valueColor: AppColors.success,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          _DailyBreakdown(entries: data.dailyBreakdown),
          const SizedBox(height: AppSpacing.sm),
          Container(height: 1, color: AppColors.border(context)),
          const SizedBox(height: AppSpacing.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '先週比 ${data.previousWeekDeltaHours >= 0 ? '+' : ''}${_format(data.previousWeekDeltaHours)}h',
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
              Text(
                '今月累計 ${_format(data.monthlyAccumulatedHours)}h',
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _format(double v) =>
      v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
}

/// 上段の 2 ステータス + 週バーグラフ + 補助キャプションを包む
/// 薄いグレーのインナーカード。
class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(context), width: 0.5),
      ),
      child: child,
    );
  }
}

class _BigStat extends StatelessWidget {
  const _BigStat({
    required this.caption,
    required this.valueText,
    required this.unitText,
    required this.valueColor,
    this.prefixText,
  });

  final String caption;
  final String valueText;
  final String unitText;
  final Color valueColor;
  final String? prefixText;

  @override
  Widget build(BuildContext context) {
    // 数字は letterSpacing を負値にしてタイトに（Noto Sans JP の全角寄り
    // グリフでも欧文っぽく見えるよう調整）。tabularFigures で 6 と 3 の
    // 字幅も揃える。
    final valueStyle = TextStyle(
      fontSize: 30,
      height: 1.0,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.8,
      color: valueColor,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
    final unitStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      color: valueColor.withValues(alpha: 0.85),
    );
    final prefixStyle = TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      color: valueColor.withValues(alpha: 0.85),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          caption,
          style: AppTextStyles.caption1.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (prefixText != null) ...[
              Text(prefixText!, style: prefixStyle),
              const SizedBox(width: 2),
            ],
            Text(valueText, style: valueStyle),
            const SizedBox(width: 2),
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Text(unitText, style: unitStyle),
            ),
          ],
        ),
      ],
    );
  }
}

class _DailyBreakdown extends StatelessWidget {
  const _DailyBreakdown({required this.entries});

  final List<DailyOvertimeEntry> entries;

  @override
  Widget build(BuildContext context) {
    final maxHours = entries.fold<double>(
      0,
      (acc, e) => e.hours > acc ? e.hours : acc,
    );
    return SizedBox(
      height: 60,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final e in entries)
            Expanded(
              child: _DailyBar(entry: e, maxHours: maxHours),
            ),
        ],
      ),
    );
  }
}

class _DailyBar extends StatelessWidget {
  const _DailyBar({required this.entry, required this.maxHours});

  final DailyOvertimeEntry entry;
  final double maxHours;

  @override
  Widget build(BuildContext context) {
    // maxHours が 0 のとき（全エントリ 0h）はゼロ除算を避けて 0 比率にする。
    // _DailyBar の高さは下限 2px（`28 * 0 + 2`）なので「データなし」が
    // フラットな最小バーで視覚化される。
    final ratio = maxHours <= 0
        ? 0.0
        : (entry.hours / maxHours).clamp(0.0, 1.0);
    final barColor = entry.isToday
        ? AppColors.brand
        : AppColors.brand.withValues(alpha: 0.35);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            entry.dayLabel,
            style: AppTextStyles.caption2.copyWith(
              color: entry.isToday
                  ? AppColors.brand
                  : AppColors.textSecondary(context),
              fontWeight: entry.isToday ? FontWeight.w700 : FontWeight.w400,
            ),
          ),
          const SizedBox(height: 4),
          Container(
            height: 28 * ratio + 2,
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            entry.hours.toStringAsFixed(1),
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ],
      ),
    );
  }
}
