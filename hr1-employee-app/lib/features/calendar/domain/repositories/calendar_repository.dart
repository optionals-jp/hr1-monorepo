import '../entities/calendar_event.dart';

/// カレンダーリポジトリインターフェース
abstract class CalendarRepository {
  /// 期間内のイベントを取得
  Future<List<CalendarEvent>> getEvents({
    required DateTime start,
    required DateTime end,
  });

  /// イベントIDで取得
  Future<CalendarEvent?> getEvent(String id);

  /// イベント作成
  Future<CalendarEvent> createEvent(CalendarEvent event);

  /// イベント更新
  Future<CalendarEvent> updateEvent(CalendarEvent event);

  /// イベント削除
  Future<void> deleteEvent(String id);

  /// 特定日にイベントがある日付のセットを取得（月表示用）
  Future<Set<DateTime>> getEventDates({
    required DateTime start,
    required DateTime end,
  });
}
