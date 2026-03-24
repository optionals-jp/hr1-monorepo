import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_shared/hr1_shared.dart' show MonthUtils;
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

/// 勤怠明細画面 — 月次サマリー＋日別一覧
class AttendanceDetailScreen extends ConsumerWidget {
  const AttendanceDetailScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedMonthProvider);
    final params = (year: selected.year, month: selected.month);
    final summaryAsync = ref.watch(monthlySummaryProvider(params));
    final dayListAsync = ref.watch(monthlyDayListProvider(params));
    final isCurrentMonth = MonthUtils.isCurrentMonth(
      selected.year,
      selected.month,
    );

    return CommonScaffold(
      appBar: AppBar(title: const Text('勤怠明細')),
      body: Column(
        children: [
          _MonthSelector(
            year: selected.year,
            month: selected.month,
            isCurrentMonth: isCurrentMonth,
            onPrev: () => ref.read(selectedMonthProvider.notifier).prevMonth(),
            onNext: () => ref.read(selectedMonthProvider.notifier).nextMonth(),
          ),
          Expanded(
            child: summaryAsync.when(
              data: (summary) => dayListAsync.when(
                data: (days) => _Body(summary: summary, days: days),
                loading: () => const LoadingIndicator(),
                error: (e, _) => ErrorState(
                  onRetry: () => ref.invalidate(monthlyRecordsProvider(params)),
                ),
              ),
              loading: () => const LoadingIndicator(),
              error: (e, _) => ErrorState(
                onRetry: () => ref.invalidate(monthlyRecordsProvider(params)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.summary, required this.days});

  final MonthlySummary summary;
  final List<DayData> days;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.md,
      ),
      children: [
        _SummarySection(summary: summary),
        const SizedBox(height: AppSpacing.xl),
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Text(
            '日別明細',
            style: AppTextStyles.headline.copyWith(
              color: AppColors.textPrimary(context),
            ),
          ),
        ),
        ...days.map(
          (day) => _DayTile(
            day: day,
            onTap: day.record != null
                ? () => _showDayDetail(context, day)
                : null,
          ),
        ),
      ],
    );
  }

  void _showDayDetail(BuildContext context, DayData day) {
    final record = day.record!;
    final dateLabel = DateFormat('M月d日（E）', 'ja').format(day.date);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      dateLabel,
                      style: AppTextStyles.headline.copyWith(
                        color: AppColors.textPrimary(context),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _StatusBadge(status: record.status, small: false),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                DetailRow(
                  label: '出勤',
                  value: record.clockIn != null
                      ? DateFormat('HH:mm').format(record.clockIn!.toLocal())
                      : '-',
                ),
                DetailRow(
                  label: '退勤',
                  value: record.clockOut != null
                      ? DateFormat('HH:mm').format(record.clockOut!.toLocal())
                      : '-',
                ),
                const Divider(height: AppSpacing.xl),
                DetailRow(
                  label: '勤務時間',
                  value: _formatMinutes(record.workMinutes),
                ),
                DetailRow(
                  label: '休憩',
                  value: _formatMinutes(record.breakMinutes),
                ),
                DetailRow(
                  label: '残業',
                  value: _formatMinutes(record.overtimeMinutes),
                  valueColor: record.overtimeMinutes > 0
                      ? AppColors.warning
                      : null,
                ),
                DetailRow(
                  label: '深夜',
                  value: _formatMinutes(record.lateNightMinutes),
                  valueColor: record.lateNightMinutes > 0
                      ? AppColors.brand
                      : null,
                ),
                if (record.note != null && record.note!.isNotEmpty) ...[
                  const Divider(height: AppSpacing.xl),
                  Text(
                    '備考',
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(record.note!, style: AppTextStyles.body2),
                ],
                const SizedBox(height: AppSpacing.lg),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// ウィジェット
// ---------------------------------------------------------------------------

/// 月セレクター
class _MonthSelector extends StatelessWidget {
  const _MonthSelector({
    required this.year,
    required this.month,
    required this.isCurrentMonth,
    required this.onPrev,
    required this.onNext,
  });

  final int year;
  final int month;
  final bool isCurrentMonth;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(onPressed: onPrev, icon: const Icon(Icons.chevron_left)),
          Text(
            '$year年$month月',
            style: AppTextStyles.headline.copyWith(
              color: AppColors.textPrimary(context),
            ),
          ),
          IconButton(
            onPressed: isCurrentMonth ? null : onNext,
            icon: Icon(
              Icons.chevron_right,
              color: isCurrentMonth ? AppColors.textTertiary(context) : null,
            ),
          ),
        ],
      ),
    );
  }
}

/// サマリーセクション
class _SummarySection extends StatelessWidget {
  const _SummarySection({required this.summary});

  final MonthlySummary summary;

  @override
  Widget build(BuildContext context) {
    return CommonCard(
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          // 上段: 勤務時間系
          Row(
            children: [
              _SummaryItem(
                icon: Icons.schedule,
                color: AppColors.brand,
                label: '総労働時間',
                value: _formatMinutes(summary.totalWorkMinutes),
              ),
              _SummaryItem(
                icon: Icons.trending_up,
                color: AppColors.warning,
                label: '残業時間',
                value: _formatMinutes(summary.totalOvertimeMinutes),
              ),
              _SummaryItem(
                icon: Icons.nights_stay,
                color: Colors.indigo,
                label: '深夜時間',
                value: _formatMinutes(summary.totalLateNightMinutes),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          // 下段: 日数系
          Row(
            children: [
              _SummaryItem(
                icon: Icons.calendar_today,
                color: AppColors.success,
                label: '出勤日数',
                value: '${summary.workDayCount}日',
              ),
              _SummaryItem(
                icon: Icons.warning_amber_rounded,
                color: AppColors.error,
                label: '遅刻/早退',
                value: '${summary.lateEarlyCount}回',
              ),
              const Expanded(child: SizedBox()),
            ],
          ),
        ],
      ),
    );
  }
}

/// サマリー項目
class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: AppTextStyles.headline.copyWith(
              color: AppColors.textPrimary(context),
            ),
          ),
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

/// 日別タイル
class _DayTile extends StatelessWidget {
  const _DayTile({required this.day, this.onTap});

  final DayData day;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat('d（E）', 'ja').format(day.date);
    final record = day.record;
    final textColor = day.isWeekend && record == null
        ? AppColors.textTertiary(context)
        : AppColors.textPrimary(context);

    return InkWell(
      onTap: onTap,
      borderRadius: AppRadius.radius80,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(color: AppColors.divider(context), width: 0.5),
          ),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 64,
              child: Text(
                dateLabel,
                style: AppTextStyles.body2.copyWith(
                  color: textColor,
                  fontWeight: day.date.weekday == DateTime.sunday
                      ? FontWeight.w600
                      : null,
                ),
              ),
            ),
            if (record != null) ...[
              _StatusBadge(status: record.status, small: true),
              const SizedBox(width: AppSpacing.sm),
            ],
            Expanded(
              child: record != null
                  ? Text(
                      '${record.clockIn != null ? DateFormat('HH:mm').format(record.clockIn!.toLocal()) : '-'}'
                      ' ~ '
                      '${record.clockOut != null ? DateFormat('HH:mm').format(record.clockOut!.toLocal()) : '-'}',
                      style: AppTextStyles.body2.copyWith(color: textColor),
                    )
                  : Text(
                      day.isWeekend ? '休日' : '-',
                      style: AppTextStyles.body2.copyWith(
                        color: AppColors.textTertiary(context),
                      ),
                    ),
            ),
            if (record != null && record.workMinutes > 0)
              Text(
                record.workDurationFormatted,
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            if (record != null)
              Icon(
                Icons.chevron_right,
                size: 16,
                color: AppColors.textTertiary(context),
              ),
          ],
        ),
      ),
    );
  }
}

/// ステータスバッジ
class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status, this.small = false});

  final String status;
  final bool small;

  Color get _color {
    switch (status) {
      case AttendanceStatus.present:
        return AppColors.success;
      case AttendanceStatus.late:
      case AttendanceStatus.earlyLeave:
        return AppColors.warning;
      case AttendanceStatus.absent:
        return AppColors.error;
      case AttendanceStatus.paidLeave:
      case AttendanceStatus.halfDayAm:
      case AttendanceStatus.halfDayPm:
      case AttendanceStatus.specialLeave:
        return AppColors.brand;
      case AttendanceStatus.sickLeave:
        return AppColors.purple;
      case AttendanceStatus.holiday:
        return AppColors.lightTextTertiary;
      default:
        return AppColors.lightTextTertiary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 6 : 8,
        vertical: small ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: AppRadius.radius40,
      ),
      child: Text(
        AttendanceStatus.label(status),
        style: (small ? AppTextStyles.caption2 : AppTextStyles.caption1)
            .copyWith(color: _color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

String _formatMinutes(int minutes) {
  if (minutes <= 0) return '0:00';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return '$h:${m.toString().padLeft(2, '0')}';
}
