import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';

/// Outlook スタイルの折りたたみ可能ミニカレンダー
class MiniCalendar extends StatelessWidget {
  const MiniCalendar({
    super.key,
    required this.focusedMonth,
    required this.selectedDate,
    required this.onDateSelected,
    required this.onMonthChanged,
    required this.isExpanded,
    required this.onToggleExpand,
    this.eventDates = const {},
  });

  final DateTime focusedMonth;
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateSelected;
  final ValueChanged<DateTime> onMonthChanged;
  final bool isExpanded;
  final VoidCallback onToggleExpand;
  final Set<DateTime> eventDates;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null) {
          if (details.primaryVelocity! > 0 && !isExpanded) {
            onToggleExpand();
          } else if (details.primaryVelocity! < 0 && isExpanded) {
            onToggleExpand();
          }
        }
      },
      child: Column(
        children: [
          // 曜日ヘッダー
          _WeekdayHeader(theme: theme),
          // 日付グリッド
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: _buildDateGrid(context),
          ),
          // 展開/折りたたみハンドル
          _ExpandHandle(
            isExpanded: isExpanded,
            onTap: onToggleExpand,
            theme: theme,
          ),
        ],
      ),
    );
  }

  Widget _buildDateGrid(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    final firstOfMonth = DateTime(focusedMonth.year, focusedMonth.month, 1);
    final lastOfMonth =
        DateTime(focusedMonth.year, focusedMonth.month + 1, 0);
    // 月曜始まり
    final startWeekday = firstOfMonth.weekday; // 1=月 7=日
    final startDate = firstOfMonth.subtract(Duration(days: startWeekday - 1));

    final totalDays = lastOfMonth.day + (startWeekday - 1);
    final rows = (totalDays / 7).ceil();

    // 選択日がある行を特定
    final selectedDayOffset =
        selectedDate.difference(startDate).inDays;
    final selectedRow = selectedDayOffset ~/ 7;

    // 折りたたみ時: 選択日の行 ± 1行（計3行）を表示
    final visibleRowStart =
        isExpanded ? 0 : (selectedRow - 1).clamp(0, rows - 3);
    final visibleRowEnd =
        isExpanded ? rows : (visibleRowStart + 3).clamp(3, rows);

    return Column(
      children: [
        for (var row = visibleRowStart; row < visibleRowEnd; row++)
          Row(
            children: [
              for (var col = 0; col < 7; col++)
                _buildDayCell(
                  context,
                  startDate.add(Duration(days: row * 7 + col)),
                  todayDate,
                  theme,
                ),
            ],
          ),
      ],
    );
  }

  Widget _buildDayCell(
    BuildContext context,
    DateTime date,
    DateTime today,
    ThemeData theme,
  ) {
    final isToday = date == today;
    final isSelected = date == selectedDate;
    final isCurrentMonth = date.month == focusedMonth.month;
    final hasEvent = eventDates.contains(date);

    Color textColor;
    if (!isCurrentMonth) {
      textColor = theme.colorScheme.onSurface.withValues(alpha: 0.3);
    } else if (isToday) {
      textColor = Colors.white;
    } else if (isSelected) {
      textColor = AppColors.brandPrimary;
    } else if (date.weekday == 6 || date.weekday == 7) {
      textColor = theme.colorScheme.onSurface.withValues(alpha: 0.5);
    } else {
      textColor = theme.colorScheme.onSurface;
    }

    return Expanded(
      child: GestureDetector(
        onTap: () => onDateSelected(date),
        child: Container(
          height: 40,
          alignment: Alignment.center,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isToday
                      ? AppColors.brandPrimary
                      : isSelected
                          ? AppColors.brandPrimary.withValues(alpha: 0.1)
                          : null,
                  shape: BoxShape.circle,
                  border: isSelected && !isToday
                      ? Border.all(color: AppColors.brandPrimary, width: 1.5)
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${date.day}',
                  style: AppTextStyles.caption.copyWith(
                    color: textColor,
                    fontWeight:
                        isToday || isSelected ? FontWeight.w600 : null,
                    fontSize: 13,
                  ),
                ),
              ),
              // イベントドット
              SizedBox(
                height: 6,
                child: hasEvent && !isToday
                    ? Container(
                        width: 4,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.brandPrimary,
                          shape: BoxShape.circle,
                        ),
                      )
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 曜日ヘッダー
class _WeekdayHeader extends StatelessWidget {
  const _WeekdayHeader({required this.theme});
  final ThemeData theme;

  static const _weekdays = ['月', '火', '水', '木', '金', '土', '日'];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: _weekdays.map((d) {
          final isWeekend = d == '土' || d == '日';
          return Expanded(
            child: Center(
              child: Text(
                d,
                style: AppTextStyles.label.copyWith(
                  color: isWeekend
                      ? theme.colorScheme.onSurface.withValues(alpha: 0.4)
                      : theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// 展開/折りたたみハンドル
class _ExpandHandle extends StatelessWidget {
  const _ExpandHandle({
    required this.isExpanded,
    required this.onTap,
    required this.theme,
  });

  final bool isExpanded;
  final VoidCallback onTap;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Center(
          child: Icon(
            isExpanded
                ? Icons.keyboard_arrow_up_rounded
                : Icons.keyboard_arrow_down_rounded,
            size: 20,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
          ),
        ),
      ),
    );
  }
}
