import 'package:flutter/material.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// シフト種別
enum ShiftType {
  work('出勤', Icons.check_circle_outline, FluentChipColor.success),
  dayOff('休み', Icons.do_not_disturb_on_outlined, FluentChipColor.neutral),
  paidLeave('有給', Icons.beach_access_outlined, FluentChipColor.brand),
  compDay('代休', Icons.event_available_outlined, FluentChipColor.brand),
  halfDayAm('午前休', Icons.wb_sunny_outlined, FluentChipColor.warning),
  halfDayPm('午後休', Icons.nights_stay_outlined, FluentChipColor.warning),
  sickLeave('病欠', Icons.local_hospital_outlined, FluentChipColor.danger);

  const ShiftType(this.label, this.icon, this.chipColor);
  final String label;
  final IconData icon;
  final FluentChipColor chipColor;

  bool get hasTime => this == work || this == halfDayAm || this == halfDayPm;
}

/// 日別シフト希望データ
class DayShift {
  const DayShift({this.type = ShiftType.work, this.startTime, this.endTime});

  final ShiftType type;
  final String? startTime;
  final String? endTime;

  bool get isAvailable => type.hasTime;
}

/// 日付文字列を生成
String formatDateStr(int year, int month, int day) {
  return '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
}

/// 指定月のデフォルトシフトマップを生成
DayShift defaultShiftForDate(DateTime date) {
  final isWeekend =
      date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
  return DayShift(
    type: isWeekend ? ShiftType.dayOff : ShiftType.work,
    startTime: isWeekend ? null : '09:00',
    endTime: isWeekend ? null : '18:00',
  );
}
