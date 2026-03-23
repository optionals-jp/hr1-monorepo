import 'package:flutter/material.dart';
import '../../../../core/constants/constants.dart';

/// Outlook スタイルの折りたたみ可能ミニカレンダー
class MiniCalendar extends StatefulWidget {
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
  State<MiniCalendar> createState() => _MiniCalendarState();
}

class _MiniCalendarState extends State<MiniCalendar> {
  static const _pageCenter = 1200; // ±100年分
  static const _fixedRows = 6; // 常に6行表示
  static const _rowHeight = 40.0;
  late final PageController _pageController;
  late DateTime _baseMonth;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _baseMonth = DateTime(widget.focusedMonth.year, widget.focusedMonth.month);
    _pageController = PageController(initialPage: _pageCenter);
  }

  @override
  void didUpdateWidget(MiniCalendar oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 外部から月が変わった時（月ピッカー等）にPageViewを同期
    if (oldWidget.focusedMonth.year != widget.focusedMonth.year ||
        oldWidget.focusedMonth.month != widget.focusedMonth.month) {
      final targetPage =
          _pageCenter + _monthDiff(widget.focusedMonth, _baseMonth);
      if (_pageController.hasClients &&
          _pageController.page?.round() != targetPage) {
        _isSyncing = true;
        _pageController.jumpToPage(targetPage);
        _isSyncing = false;
      }
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  int _monthDiff(DateTime a, DateTime b) =>
      (a.year - b.year) * 12 + (a.month - b.month);

  DateTime _monthForPage(int page) {
    final offset = page - _pageCenter;
    return DateTime(_baseMonth.year, _baseMonth.month + offset);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null) {
          if (details.primaryVelocity! > 0 && !widget.isExpanded) {
            widget.onToggleExpand();
          } else if (details.primaryVelocity! < 0 && widget.isExpanded) {
            widget.onToggleExpand();
          }
        }
      },
      child: Column(
        children: [
          // 曜日ヘッダー
          const _WeekdayHeader(),
          // 日付グリッド（PageView）
          AnimatedSize(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            child: SizedBox(
              // 常に6行分の高さを確保（月による行数の違いでオーバーフローしないように）
              height: widget.isExpanded ? _fixedRows * _rowHeight : _rowHeight,
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (page) {
                  if (_isSyncing) return;
                  final month = _monthForPage(page);
                  widget.onMonthChanged(month);
                },
                itemBuilder: (context, page) {
                  final month = _monthForPage(page);
                  return _buildDateGrid(context, month);
                },
              ),
            ),
          ),
          // 展開/折りたたみハンドル
          _ExpandHandle(
            isExpanded: widget.isExpanded,
            onTap: widget.onToggleExpand,
          ),
        ],
      ),
    );
  }

  Widget _buildDateGrid(BuildContext context, DateTime month) {
    final theme = Theme.of(context);
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);

    final firstOfMonth = DateTime(month.year, month.month, 1);
    // 月曜始まり
    final startWeekday = firstOfMonth.weekday; // 1=月 7=日
    final startDate = firstOfMonth.subtract(Duration(days: startWeekday - 1));

    // 選択日がある行を特定
    final selectedDayOffset = widget.selectedDate.difference(startDate).inDays;
    final selectedRow = selectedDayOffset ~/ 7;

    // 折りたたみ時: 選択日の行のみ（1行）を表示
    final visibleRowStart = widget.isExpanded
        ? 0
        : selectedRow.clamp(0, _fixedRows - 1);
    final visibleRowEnd = widget.isExpanded
        ? _fixedRows
        : (visibleRowStart + 1).clamp(1, _fixedRows);

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
                  month,
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
    DateTime month,
    ThemeData theme,
  ) {
    final isToday = date == today;
    final isSelected = date == widget.selectedDate;
    final isCurrentMonth = date.month == month.month;
    final hasEvent = widget.eventDates.contains(date);

    Color textColor;
    if (!isCurrentMonth) {
      textColor = AppColors.textTertiary(theme.brightness);
    } else if (isToday) {
      textColor = Colors.white;
    } else if (isSelected) {
      textColor = AppColors.brand;
    } else if (date.weekday == 6 || date.weekday == 7) {
      textColor = AppColors.textSecondary(theme.brightness);
    } else {
      textColor = theme.colorScheme.onSurface;
    }

    return Expanded(
      child: GestureDetector(
        onTap: () => widget.onDateSelected(date),
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
                      ? AppColors.brand
                      : isSelected
                      ? AppColors.brand.withValues(alpha: 0.1)
                      : null,
                  shape: BoxShape.circle,
                  border: isSelected && !isToday
                      ? Border.all(color: AppColors.brand, width: 1.5)
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${date.day}',
                  style: AppTextStyles.footnote.copyWith(
                    color: textColor,
                    fontWeight: isToday || isSelected ? FontWeight.w600 : null,
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
                        decoration: const BoxDecoration(
                          color: AppColors.brand,
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
  const _WeekdayHeader();

  static const _weekdays = ['月', '火', '水', '木', '金', '土', '日'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: _weekdays.map((d) {
          final isWeekend = d == '土' || d == '日';
          return Expanded(
            child: Center(
              child: Text(
                d,
                style: AppTextStyles.caption1.copyWith(
                  fontWeight: FontWeight.w500,
                  color: isWeekend
                      ? AppColors.textTertiary(theme.brightness)
                      : AppColors.textSecondary(theme.brightness),
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
  const _ExpandHandle({required this.isExpanded, required this.onTap});

  final bool isExpanded;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
            color: AppColors.textTertiary(theme.brightness),
          ),
        ),
      ),
    );
  }
}
