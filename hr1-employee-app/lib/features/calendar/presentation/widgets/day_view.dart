import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/calendar/domain/entities/calendar_event.dart';

/// Outlook スタイルのデイビュー（時間軸グリッド）
class DayView extends StatefulWidget {
  const DayView({
    super.key,
    required this.date,
    required this.events,
    this.punches = const [],
    this.onEventTap,
    this.onTimeSlotTap,
  });

  final DateTime date;
  final List<CalendarEvent> events;
  final List<AttendancePunch> punches;
  final ValueChanged<CalendarEvent>? onEventTap;
  final ValueChanged<DateTime>? onTimeSlotTap;

  @override
  State<DayView> createState() => _DayViewState();
}

class _DayViewState extends State<DayView> {
  final _scrollController = ScrollController();
  static const double _hourHeight = 60.0;
  static const double _timeColumnWidth = 52.0;

  @override
  void initState() {
    super.initState();
    // 現在時刻付近にスクロール
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final now = DateTime.now();
      if (_isToday) {
        final offset = (now.hour - 1).clamp(0, 23) * _hourHeight;
        _scrollController.jumpTo(offset);
      } else {
        // 8時にスクロール
        _scrollController.jumpTo(7 * _hourHeight);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  bool get _isToday {
    final now = DateTime.now();
    return widget.date.year == now.year &&
        widget.date.month == now.month &&
        widget.date.day == now.day;
  }

  @override
  Widget build(BuildContext context) {
    final allDayEvents = widget.events.where((e) => e.isAllDay).toList();
    final timedEvents = widget.events.where((e) => !e.isAllDay).toList();

    return Column(
      children: [
        // 終日イベントストリップ
        if (allDayEvents.isNotEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(_timeColumnWidth + 8, 4, 8, 4),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: AppColors.border(context),
                  width: 0.5,
                ),
              ),
            ),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              children: allDayEvents.map((event) {
                final color = _parseColor(event.categoryColor);
                return GestureDetector(
                  onTap: () => widget.onEventTap?.call(event),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.15),
                      borderRadius: AppRadius.radius40,
                    ),
                    child: Text(
                      event.title,
                      style: AppTextStyles.caption1.copyWith(
                        color: color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        // 時間軸グリッド
        Expanded(
          child: SingleChildScrollView(
            controller: _scrollController,
            child: SizedBox(
              height: 24 * _hourHeight,
              child: Stack(
                children: [
                  // 時間ラベル + 水平線
                  for (var h = 0; h < 24; h++)
                    Positioned(
                      top: h * _hourHeight,
                      left: 0,
                      right: 0,
                      child: _HourRow(hour: h),
                    ),
                  // 勤怠バー（打刻間の状態を色付きバーで表示）
                  ..._buildAttendanceBars(),
                  // 勤怠打刻マーカー（左端）
                  ...widget.punches.map((punch) => _buildPunchMarker(punch)),
                  // イベントブロック
                  ...timedEvents.map(
                    (event) => _buildEventBlock(event, timedEvents),
                  ),
                  // 現在時刻インジケーター
                  if (_isToday) const _CurrentTimeIndicator(),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  /// 打刻間の状態バーを生成（勤務中=緑、休憩中=黄）
  List<Widget> _buildAttendanceBars() {
    final punches = widget.punches;
    if (punches.isEmpty) return [];

    final bars = <Widget>[];
    for (var i = 0; i < punches.length - 1; i++) {
      final current = punches[i];
      final next = punches[i + 1];

      // 勤務中 or 休憩中を判定
      final isBreak = current.punchType == 'break_start';
      final color = isBreak ? AppColors.warning : AppColors.success;

      final startMin = _toMinutes(current.punchedAt.toLocal());
      final endMin = _toMinutes(next.punchedAt.toLocal());
      final topPos = startMin * _hourHeight / 60;
      final height = (endMin - startMin) * _hourHeight / 60;

      if (height <= 0) continue;

      bars.add(
        Positioned(
          top: topPos,
          left: _timeColumnWidth - 6,
          child: Container(
            width: 3,
            height: height,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(1.5),
            ),
          ),
        ),
      );
    }
    return bars;
  }

  double _toMinutes(DateTime local) =>
      (local.hour * 60 + local.minute).toDouble();

  Widget _buildPunchMarker(AttendancePunch punch) {
    final local = punch.punchedAt.toLocal();
    final minutes = local.hour * 60 + local.minute;
    final top = minutes * _hourHeight / 60;

    final (iconBuilder, color) = switch (punch.punchType) {
      'clock_in' => (AppIcons.login, AppColors.success),
      'clock_out' => (AppIcons.logout, AppColors.error),
      'break_start' => (AppIcons.coffee, AppColors.warning),
      'break_end' => (AppIcons.pause, AppColors.brandLight),
      _ => (AppIcons.clock, AppColors.textSecondary(context)),
    };

    return Positioned(
      top: top - 10,
      left: _timeColumnWidth - 16,
      child: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: AppColors.surface(context),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withValues(alpha: 0.15),
                width: 1,
              ),
            ),
            child: Center(child: iconBuilder(size: 10, color: color)),
          ),
        ),
      ),
    );
  }

  Widget _buildEventBlock(
    CalendarEvent event,
    List<CalendarEvent> allTimedEvents,
  ) {
    final startLocal = event.startAt.toLocal();
    final endLocal = event.endAt.toLocal();
    final startMinutes = startLocal.hour * 60 + startLocal.minute;
    final endMinutes = endLocal.hour * 60 + endLocal.minute;
    final durationMinutes = (endMinutes - startMinutes).clamp(15, 24 * 60);

    final top = startMinutes * _hourHeight / 60;
    final height = durationMinutes * _hourHeight / 60;
    final color = _parseColor(event.categoryColor);

    return Positioned(
      top: top,
      left: _timeColumnWidth + 4,
      right: 8,
      height: height,
      child: GestureDetector(
        onTap: () => widget.onEventTap?.call(event),
        child: Container(
          margin: const EdgeInsets.only(bottom: 1),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(6),
            border: Border(left: BorderSide(color: color, width: 3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                event.title,
                style: AppTextStyles.caption2.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary(context),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (height > 36)
                Text(
                  '${DateFormat('HH:mm').format(startLocal)} - ${DateFormat('HH:mm').format(endLocal)}',
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(context),
                  ),
                ),
              if (height > 52 && event.location != null)
                Text(
                  event.location!,
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w500,
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return AppColors.brand;
    }
  }
}

/// 時間行
class _HourRow extends StatelessWidget {
  const _HourRow({required this.hour});
  final int hour;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 60,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 52,
            child: Padding(
              padding: const EdgeInsets.only(right: 8, top: 0),
              child: Text(
                '${hour.toString().padLeft(2, '0')}:00',
                style: AppTextStyles.caption1.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppColors.textTertiary(context),
                  fontFeatures: [const FontFeature.tabularFigures()],
                ),
                textAlign: TextAlign.right,
              ),
            ),
          ),
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: AppColors.border(context), width: 0.5),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 現在時刻インジケーター（赤い水平線）
class _CurrentTimeIndicator extends StatelessWidget {
  const _CurrentTimeIndicator();

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final minutes = now.hour * 60 + now.minute;
    final top = minutes * 60.0 / 60;

    return Positioned(
      top: top,
      left: 46,
      right: 0,
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.error,
              shape: BoxShape.circle,
            ),
          ),
          Expanded(child: Container(height: 1.5, color: AppColors.error)),
        ],
      ),
    );
  }
}
