/// 月の前後移動・判定に関するユーティリティ
class MonthUtils {
  const MonthUtils._();

  /// 指定した年月が現在の月かどうかを返す
  static bool isCurrentMonth(int year, int month) {
    final now = DateTime.now();
    return year == now.year && month == now.month;
  }

  /// 前月の (year, month) を返す
  static ({int year, int month}) prevMonth(int year, int month) {
    if (month == 1) {
      return (year: year - 1, month: 12);
    }
    return (year: year, month: month - 1);
  }

  /// 翌月の (year, month) を返す
  static ({int year, int month}) nextMonth(int year, int month) {
    if (month == 12) {
      return (year: year + 1, month: 1);
    }
    return (year: year, month: month + 1);
  }
}
