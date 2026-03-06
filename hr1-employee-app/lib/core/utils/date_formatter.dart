import 'package:intl/intl.dart';

/// 日付フォーマットユーティリティ
class DateFormatter {
  DateFormatter._();

  /// 年月日（例: 2024年1月15日）
  static String toJapaneseDate(DateTime date) {
    return DateFormat('yyyy年M月d日').format(date);
  }

  /// 年月日 短縮（例: 2024/01/15）
  static String toShortDate(DateTime date) {
    return DateFormat('yyyy/MM/dd').format(date);
  }

  /// 年月日時分（例: 2024/01/15 14:30）
  static String toDateTime(DateTime date) {
    return DateFormat('yyyy/MM/dd HH:mm').format(date);
  }

  /// 時刻のみ（例: 14:30）
  static String toTime(DateTime date) {
    return DateFormat('HH:mm').format(date);
  }

  /// 相対時間（例: 3分前、1時間前、昨日）
  static String toRelative(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'たった今';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分前';
    if (diff.inHours < 24) return '${diff.inHours}時間前';
    if (diff.inDays < 7) return '${diff.inDays}日前';
    return toShortDate(date);
  }

  /// 年月（例: 2024年1月）
  static String toYearMonth(DateTime date) {
    return DateFormat('yyyy年M月').format(date);
  }
}
