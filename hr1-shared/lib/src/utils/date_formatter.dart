import 'package:intl/intl.dart';

/// 日付フォーマットユーティリティ
///
/// Supabase の timestamptz は UTC で返されるため、
/// 全メソッドで `.toLocal()` を適用してからフォーマットする。
class DateFormatter {
  DateFormatter._();

  /// 年月日（例: 2024年1月15日）
  static String toJapaneseDate(DateTime date) {
    return DateFormat('yyyy年M月d日').format(date.toLocal());
  }

  /// 年月日 短縮（例: 2024/01/15）
  static String toShortDate(DateTime date) {
    return DateFormat('yyyy/MM/dd').format(date.toLocal());
  }

  /// 年月日時分（例: 2024/01/15 14:30）
  static String toDateTime(DateTime date) {
    return DateFormat('yyyy/MM/dd HH:mm').format(date.toLocal());
  }

  /// 時刻のみ（例: 14:30）
  static String toTime(DateTime date) {
    return DateFormat('HH:mm').format(date.toLocal());
  }

  /// 相対時間（例: 3分前、1時間前、昨日）
  static String toRelative(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date.toLocal());

    if (diff.inMinutes < 1) return 'たった今';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分前';
    if (diff.inHours < 24) return '${diff.inHours}時間前';
    if (diff.inDays < 7) return '${diff.inDays}日前';
    return toShortDate(date);
  }

  /// 年月（例: 2024年1月）
  static String toYearMonth(DateTime date) {
    return DateFormat('yyyy年M月').format(date.toLocal());
  }

  /// 相対日付（今日/昨日/M月d日/yyyy年M月d日）
  static String toRelativeDate(DateTime date) {
    final now = DateTime.now();
    final local = date.toLocal();
    if (local.year == now.year &&
        local.month == now.month &&
        local.day == now.day) {
      return '今日';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (local.year == yesterday.year &&
        local.month == yesterday.month &&
        local.day == yesterday.day) {
      return '昨日';
    }
    if (local.year == now.year) return '${local.month}月${local.day}日';
    return '${local.year}年${local.month}月${local.day}日';
  }

  /// メッセージ一覧用（今日→HH:mm、今年→M/d、他→yyyy/M/d）
  static String toMessageDate(DateTime date) {
    final now = DateTime.now();
    final local = date.toLocal();
    if (local.year == now.year &&
        local.month == now.month &&
        local.day == now.day) {
      return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    }
    if (local.year == now.year) return '${local.month}/${local.day}';
    return '${local.year}/${local.month}/${local.day}';
  }

  /// 短い日付（yyyy/MM/dd）
  static String toDateSlash(DateTime date) {
    final local = date.toLocal();
    return '${local.year}/${local.month.toString().padLeft(2, '0')}/${local.day.toString().padLeft(2, '0')}';
  }

  /// 日付と曜日（例: 3月26日(木)）
  static String toDateWithWeekday(DateTime date) {
    return DateFormat('M月d日(E)', 'ja').format(date.toLocal());
  }

  /// 日付・曜日・時刻（例: 3月26日(木) 14:30）
  static String toDateTimeWithWeekday(DateTime date) {
    return DateFormat('M月d日(E) HH:mm', 'ja').format(date.toLocal());
  }

  /// 時間帯（例: 14:30 〜 15:30）
  static String toTimeRange(DateTime start, DateTime end) {
    return '${toTime(start)} 〜 ${toTime(end)}';
  }

  /// 短い月日（例: 3/26）
  static String toMonthDay(DateTime date) {
    final local = date.toLocal();
    return '${local.month}/${local.day}';
  }
}
