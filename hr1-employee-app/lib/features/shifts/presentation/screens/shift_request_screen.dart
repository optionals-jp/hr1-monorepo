import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_type.dart';
import 'package:hr1_employee_app/features/shifts/presentation/controllers/shift_request_controller.dart';
import 'package:hr1_employee_app/features/shifts/presentation/providers/shift_providers.dart';

/// シフト希望提出画面
class ShiftRequestScreen extends ConsumerStatefulWidget {
  const ShiftRequestScreen({super.key});

  @override
  ConsumerState<ShiftRequestScreen> createState() => _ShiftRequestScreenState();
}

class _ShiftRequestScreenState extends ConsumerState<ShiftRequestScreen> {
  late int _year;
  late int _month;
  final Map<String, DayShift> _edits = {};
  bool _hasExistingSubmission = false;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final next = DateTime(now.year, now.month + 1);
    _year = next.year;
    _month = next.month;
  }

  void _onDataLoaded(List<dynamic> requests) {
    if (_loaded) return;
    _loaded = true;
    _hasExistingSubmission = requests.any((r) => r.isSubmitted);
    for (final r in requests) {
      _edits[r.targetDate] = DayShift(
        type: r.isAvailable ? ShiftType.work : ShiftType.dayOff,
        startTime: r.startTime,
        endTime: r.endTime,
      );
    }
  }

  void _selectMonth(BuildContext context) {
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
              final selected = m.year == _year && m.month == _month;
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
                  if (m.year != _year || m.month != _month) {
                    setState(() {
                      _year = m.year;
                      _month = m.month;
                      _edits.clear();
                      _loaded = false;
                    });
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

  Future<void> _submit() async {
    await ref
        .read(shiftRequestControllerProvider.notifier)
        .submit(year: _year, month: _month, edits: _edits);

    final state = ref.read(shiftRequestControllerProvider);
    if (!mounted) return;
    if (state.submitted) {
      CommonSnackBar.show(context, 'シフト希望を提出しました');
      Navigator.of(context).pop();
    } else if (state.error != null) {
      CommonSnackBar.error(context, '提出に失敗しました: ${state.error}');
    }
  }

  DayShift _shiftFor(String dateStr, DateTime date) {
    return _edits[dateStr] ?? defaultShiftForDate(date);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final requestsAsync = ref.watch(
      shiftRequestsProvider((year: _year, month: _month)),
    );
    final controllerState = ref.watch(shiftRequestControllerProvider);
    final lastDay = DateTime(_year, _month + 1, 0).day;

    return CommonScaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => _selectMonth(context),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('$_year年$_month月', style: AppTextStyles.headline),
              const SizedBox(width: AppSpacing.xs),
              Icon(
                Icons.keyboard_arrow_down,
                size: 20,
                color: theme.colorScheme.onSurface,
              ),
            ],
          ),
        ),
        centerTitle: true,
      ),
      body: requestsAsync.when(
        data: (requests) {
          _onDataLoaded(requests);
          return Column(
            children: [
              // 提出済みバナー
              if (_hasExistingSubmission)
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

              // サマリー
              _ShiftSummaryBar(
                year: _year,
                month: _month,
                edits: _edits,
                theme: theme,
              ),

              // 日別リスト
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  itemCount: lastDay,
                  itemBuilder: (context, index) {
                    final day = index + 1;
                    final date = DateTime(_year, _month, day);
                    final dateStr = formatDateStr(_year, _month, day);
                    final dayShift = _shiftFor(dateStr, date);

                    return _DayShiftTile(
                      date: date,
                      dayShift: dayShift,
                      onChanged: (updated) {
                        setState(() => _edits[dateStr] = updated);
                      },
                    );
                  },
                ),
              ),

              // 提出ボタン
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                  child: CommonButton(
                    onPressed: _submit,
                    loading: controllerState.isSubmitting,
                    enabled: !controllerState.isSubmitting,
                    child: Text(_hasExistingSubmission ? '再提出' : '提出'),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(
            shiftRequestsProvider((year: _year, month: _month)),
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
    required this.theme,
  });

  final int year;
  final int month;
  final Map<String, DayShift> edits;
  final ThemeData theme;

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

    final isDark = theme.brightness == Brightness.dark;
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
          color: isDark
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
              color: AppColors.textSecondary(theme.brightness),
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
    final theme = Theme.of(context);
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
          bottom: BorderSide(
            color: AppColors.divider(theme.brightness),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          // 日付
          SizedBox(
            width: 64,
            child: Text(
              dateLabel,
              style: AppTextStyles.body2.copyWith(
                color: isWeekend
                    ? AppColors.error.withValues(alpha: 0.7)
                    : theme.colorScheme.onSurface,
                fontWeight: date.weekday == DateTime.sunday
                    ? FontWeight.w600
                    : null,
              ),
            ),
          ),

          // シフト種別 Chip
          FluentChip(
            label: Text(dayShift.type.label),
            color: dayShift.type.chipColor,
            icon: dayShift.type.icon,
            onTap: () => _showShiftTypePicker(context),
          ),
          const SizedBox(width: AppSpacing.md),

          // 時間選択エリア
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
                            color: theme.colorScheme.onSurface,
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
    final theme = Theme.of(context);
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
                      : AppColors.textSecondary(theme.brightness),
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
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border(theme.brightness)),
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
