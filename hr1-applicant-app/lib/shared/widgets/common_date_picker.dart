import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';

/// カスタム日付選択 BottomSheet
///
/// ```dart
/// final picked = await CommonDatePicker.show(
///   context: context,
///   initialDate: DateTime.now(),
///   firstDate: DateTime.now(),
/// );
/// ```
class CommonDatePicker extends StatefulWidget {
  const CommonDatePicker({
    super.key,
    this.initialDate,
    this.firstDate,
    this.lastDate,
  });

  final DateTime? initialDate;
  final DateTime? firstDate;
  final DateTime? lastDate;

  /// BottomSheet で日付選択を表示し、選択された日付を返す
  static Future<DateTime?> show({
    required BuildContext context,
    DateTime? initialDate,
    DateTime? firstDate,
    DateTime? lastDate,
  }) {
    return showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CommonDatePicker(
        initialDate: initialDate,
        firstDate: firstDate,
        lastDate: lastDate,
      ),
    );
  }

  @override
  State<CommonDatePicker> createState() => _CommonDatePickerState();
}

class _CommonDatePickerState extends State<CommonDatePicker> {
  late DateTime _displayMonth;
  DateTime? _selectedDate;
  late final DateTime _firstDate;
  late final DateTime _lastDate;

  static const _weekDays = ['月', '火', '水', '木', '金', '土', '日'];

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _displayMonth = DateTime(
      (widget.initialDate ?? DateTime.now()).year,
      (widget.initialDate ?? DateTime.now()).month,
    );
    _firstDate = widget.firstDate ?? DateTime(2020);
    _lastDate = widget.lastDate ?? DateTime(2030, 12, 31);
  }

  void _prevMonth() {
    final prev = DateTime(_displayMonth.year, _displayMonth.month - 1);
    if (!prev.isBefore(DateTime(_firstDate.year, _firstDate.month))) {
      setState(() => _displayMonth = prev);
    }
  }

  void _nextMonth() {
    final next = DateTime(_displayMonth.year, _displayMonth.month + 1);
    if (!next.isAfter(DateTime(_lastDate.year, _lastDate.month))) {
      setState(() => _displayMonth = next);
    }
  }

  bool _isSelectable(DateTime date) {
    final dateOnly = DateTime(date.year, date.month, date.day);
    final firstOnly = DateTime(
      _firstDate.year,
      _firstDate.month,
      _firstDate.day,
    );
    final lastOnly = DateTime(_lastDate.year, _lastDate.month, _lastDate.day);
    return !dateOnly.isBefore(firstOnly) && !dateOnly.isAfter(lastOnly);
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isToday(DateTime date) {
    return _isSameDay(date, DateTime.now());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            // ハンドル
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            // 月ナビゲーション
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    onPressed: _prevMonth,
                    icon: const Icon(Icons.chevron_left_rounded, size: 28),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 40,
                    ),
                  ),
                  Text(
                    '${_displayMonth.year}年${_displayMonth.month}月',
                    style: AppTextStyles.callout,
                  ),
                  IconButton(
                    onPressed: _nextMonth,
                    icon: const Icon(Icons.chevron_right_rounded, size: 28),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 40,
                      minHeight: 40,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.md),

            // 曜日ヘッダー
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: Row(
                children: _weekDays.map((day) {
                  final isWeekend = day == '土' || day == '日';
                  return Expanded(
                    child: Center(
                      child: Text(
                        day,
                        style: AppTextStyles.caption2.copyWith(
                          color: isWeekend
                              ? AppColors.textSecondary
                              : theme.colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: AppSpacing.sm),

            // カレンダーグリッド
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: _buildCalendarGrid(theme),
            ),

            const SizedBox(height: AppSpacing.lg),

            // ボタン
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primaryLight,
                        side: const BorderSide(color: AppColors.primaryLight),
                        shape: const StadiumBorder(),
                        minimumSize: const Size(0, 44),
                      ),
                      child: const Text('キャンセル'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _selectedDate != null
                          ? () => Navigator.pop(context, _selectedDate)
                          : null,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.primaryLight,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: AppColors.border,
                        shape: const StadiumBorder(),
                        minimumSize: const Size(0, 44),
                      ),
                      child: const Text('選択'),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  Widget _buildCalendarGrid(ThemeData theme) {
    final year = _displayMonth.year;
    final month = _displayMonth.month;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    // 月曜=1, 日曜=7 → 月曜始まりのオフセット
    final firstWeekday = DateTime(year, month, 1).weekday; // 1=Mon, 7=Sun
    final offset = firstWeekday - 1;

    final totalCells = offset + daysInMonth;
    final rows = (totalCells / 7).ceil();

    return Column(
      children: List.generate(rows, (row) {
        return Row(
          children: List.generate(7, (col) {
            final cellIndex = row * 7 + col;
            final day = cellIndex - offset + 1;

            if (day < 1 || day > daysInMonth) {
              return const Expanded(child: SizedBox(height: 44));
            }

            final date = DateTime(year, month, day);
            final isSelected =
                _selectedDate != null && _isSameDay(date, _selectedDate!);
            final isToday = _isToday(date);
            final selectable = _isSelectable(date);

            return Expanded(
              child: GestureDetector(
                onTap: selectable
                    ? () => setState(() => _selectedDate = date)
                    : null,
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryLight : null,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$day',
                      style: AppTextStyles.body2.copyWith(
                        color: isSelected
                            ? Colors.white
                            : !selectable
                            ? theme.colorScheme.onSurface.withValues(alpha: 0.2)
                            : isToday
                            ? AppColors.primaryLight
                            : theme.colorScheme.onSurface,
                        fontWeight: isSelected || isToday
                            ? FontWeight.w600
                            : null,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      }),
    );
  }
}
