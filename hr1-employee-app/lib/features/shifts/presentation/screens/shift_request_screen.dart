import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_type.dart';
import 'package:hr1_employee_app/features/shifts/presentation/controllers/shift_request_controller.dart';
import 'package:hr1_employee_app/features/shifts/presentation/providers/shift_providers.dart';

class ShiftRequestScreen extends HookConsumerWidget {
  const ShiftRequestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final next = DateTime(now.year, now.month + 1);
    final year = useState(next.year);
    final month = useState(next.month);
    final edits = useState<Map<String, DayShift>>({});
    final hasExistingSubmission = useRef(false);
    final loaded = useRef(false);

    final requestsAsync = ref.watch(
      shiftRequestsProvider((year: year.value, month: month.value)),
    );
    final controllerState = ref.watch(shiftRequestControllerProvider);
    final lastDay = DateTime(year.value, month.value + 1, 0).day;

    void onDataLoaded(List<dynamic> requests) {
      if (loaded.value) return;
      loaded.value = true;
      hasExistingSubmission.value = requests.any((r) => r.isSubmitted);
      final newEdits = <String, DayShift>{};
      for (final r in requests) {
        newEdits[r.targetDate] = DayShift(
          type: r.isAvailable ? ShiftType.work : ShiftType.dayOff,
          startTime: r.startTime,
          endTime: r.endTime,
        );
      }
      edits.value = newEdits;
    }

    void selectMonth(BuildContext context) {
      final now = DateTime.now();
      final months = List.generate(7, (i) {
        final d = DateTime(now.year, now.month + i);
        return (year: d.year, month: d.month);
      });

      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppSpacing.md),
              ...months.map((m) {
                final selected = m.year == year.value && m.month == month.value;
                return ListTile(
                  title: Text(
                    '${m.year}年${m.month}月',
                    style: AppTextStyles.body1.copyWith(
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                      color: selected ? AppColors.brand : null,
                    ),
                  ),
                  trailing: selected
                      ? const Icon(Icons.check, color: AppColors.brand)
                      : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    if (m.year != year.value || m.month != month.value) {
                      year.value = m.year;
                      month.value = m.month;
                      edits.value = {};
                      loaded.value = false;
                    }
                  },
                );
              }),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      );
    }

    Future<void> submit() async {
      await ref
          .read(shiftRequestControllerProvider.notifier)
          .submit(year: year.value, month: month.value, edits: edits.value);

      final state = ref.read(shiftRequestControllerProvider);
      if (!context.mounted) return;
      if (state.submitted) {
        CommonSnackBar.show(context, 'シフト希望を提出しました');
        Navigator.of(context).pop();
      } else if (state.error != null) {
        CommonSnackBar.error(context, '提出に失敗しました: ${state.error}');
      }
    }

    DayShift shiftFor(String dateStr, DateTime date) {
      return edits.value[dateStr] ?? defaultShiftForDate(date);
    }

    return CommonScaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => selectMonth(context),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '${year.value}年${month.value}月',
                style: AppTextStyles.headline,
              ),
              const SizedBox(width: AppSpacing.xs),
              Icon(
                Icons.keyboard_arrow_down,
                size: 20,
                color: AppColors.textPrimary(context),
              ),
            ],
          ),
        ),
        centerTitle: true,
      ),
      body: requestsAsync.when(
        data: (requests) {
          onDataLoaded(requests);
          return Column(
            children: [
              if (hasExistingSubmission.value)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.check_circle,
                          size: 16,
                          color: AppColors.success,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          '提出済み — 再編集して再提出できます',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              _ShiftSummaryBar(
                year: year.value,
                month: month.value,
                edits: edits.value,
              ),

              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  itemCount: lastDay,
                  itemBuilder: (context, index) {
                    final day = index + 1;
                    final date = DateTime(year.value, month.value, day);
                    final dateStr = formatDateStr(year.value, month.value, day);
                    final dayShift = shiftFor(dateStr, date);

                    return _DayShiftTile(
                      date: date,
                      dayShift: dayShift,
                      onChanged: (updated) {
                        edits.value = {...edits.value, dateStr: updated};
                      },
                    );
                  },
                ),
              ),

              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  child: CommonButton(
                    onPressed: submit,
                    loading: controllerState.isSubmitting,
                    enabled: !controllerState.isSubmitting,
                    child: Text(hasExistingSubmission.value ? '再提出' : '提出'),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(
            shiftRequestsProvider((year: year.value, month: month.value)),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// サマリーバー
// ---------------------------------------------------------------------------

class _ShiftSummaryBar extends StatelessWidget {
  const _ShiftSummaryBar({
    required this.year,
    required this.month,
    required this.edits,
  });

  final int year;
  final int month;
  final Map<String, DayShift> edits;

  @override
  Widget build(BuildContext context) {
    final lastDay = DateTime(year, month + 1, 0).day;
    int workDays = 0;
    int offDays = 0;
    int leaveDays = 0;

    for (var d = 1; d <= lastDay; d++) {
      final date = DateTime(year, month, d);
      final shift =
          edits[formatDateStr(year, month, d)] ?? defaultShiftForDate(date);

      switch (shift.type) {
        case ShiftType.work:
          workDays++;
        case ShiftType.dayOff:
          offDays++;
        case ShiftType.halfDayAm:
        case ShiftType.halfDayPm:
          workDays++;
          leaveDays++;
        default:
          leaveDays++;
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.isDark(context)
              ? AppColors.darkSurfaceSecondary
              : AppColors.lightSurfaceSecondary,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            _SummaryItem(
              icon: Icons.work_outline,
              label: '出勤 $workDays日',
              color: AppColors.success,
            ),
            const SizedBox(width: AppSpacing.sm),
            _SummaryItem(
              icon: Icons.weekend_outlined,
              label: '休み $offDays日',
              color: AppColors.textSecondary(context),
            ),
            if (leaveDays > 0) ...[
              const SizedBox(width: AppSpacing.sm),
              _SummaryItem(
                icon: Icons.event_busy_outlined,
                label: '休暇 $leaveDays日',
                color: AppColors.brand,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpacing.xs),
        Text(
          label,
          style: AppTextStyles.body2.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// 日別タイル
// ---------------------------------------------------------------------------

class _DayShiftTile extends StatelessWidget {
  const _DayShiftTile({
    required this.date,
    required this.dayShift,
    required this.onChanged,
  });

  final DateTime date;
  final DayShift dayShift;
  final ValueChanged<DayShift> onChanged;

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat('d（E）', 'ja').format(date);
    final isWeekend =
        date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
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
                color: isWeekend
                    ? AppColors.error.withValues(alpha: 0.7)
                    : AppColors.textPrimary(context),
                fontWeight: date.weekday == DateTime.sunday
                    ? FontWeight.w600
                    : null,
              ),
            ),
          ),

          FluentChip(
            label: Text(dayShift.type.label),
            color: dayShift.type.chipColor,
            icon: dayShift.type.icon,
            onTap: () => _showShiftTypePicker(context),
          ),
          const SizedBox(width: AppSpacing.md),

          Expanded(
            child: dayShift.type.hasTime
                ? Row(
                    children: [
                      _TimeButton(
                        time: dayShift.startTime ?? '09:00',
                        onTap: () async {
                          final picked = await _pickTime(
                            context,
                            dayShift.startTime,
                          );
                          if (picked != null) {
                            onChanged(
                              DayShift(
                                type: dayShift.type,
                                startTime: picked,
                                endTime: dayShift.endTime,
                              ),
                            );
                          }
                        },
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.xs,
                        ),
                        child: Text(
                          '~',
                          style: AppTextStyles.body2.copyWith(
                            color: AppColors.textPrimary(context),
                          ),
                        ),
                      ),
                      _TimeButton(
                        time: dayShift.endTime ?? '18:00',
                        onTap: () async {
                          final picked = await _pickTime(
                            context,
                            dayShift.endTime,
                          );
                          if (picked != null) {
                            onChanged(
                              DayShift(
                                type: dayShift.type,
                                startTime: dayShift.startTime,
                                endTime: picked,
                              ),
                            );
                          }
                        },
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  void _showShiftTypePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: AppSpacing.md),
            ...ShiftType.values.map((t) {
              final selected = dayShift.type == t;
              return ListTile(
                leading: Icon(
                  t.icon,
                  color: selected
                      ? AppColors.brand
                      : AppColors.textSecondary(context),
                ),
                title: Text(t.label, style: AppTextStyles.body1),
                trailing: selected
                    ? const Icon(Icons.check, color: AppColors.brand)
                    : null,
                onTap: () {
                  Navigator.pop(ctx);
                  onChanged(
                    DayShift(
                      type: t,
                      startTime: t.hasTime
                          ? (dayShift.startTime ?? '09:00')
                          : null,
                      endTime: t.hasTime ? (dayShift.endTime ?? '18:00') : null,
                    ),
                  );
                },
              );
            }),
            const SizedBox(height: AppSpacing.md),
          ],
        ),
      ),
    );
  }

  Future<String?> _pickTime(BuildContext context, String? current) async {
    final parts = (current ?? '09:00').split(':');
    final initial = TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );

    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
    );

    if (picked == null) return null;
    return '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
  }
}

// ---------------------------------------------------------------------------
// 時間ボタン
// ---------------------------------------------------------------------------

class _TimeButton extends StatelessWidget {
  const _TimeButton({required this.time, required this.onTap});

  final String time;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border(context)),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          time,
          style: AppTextStyles.body2.copyWith(
            color: AppColors.brand,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
