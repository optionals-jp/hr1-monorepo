import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';
import '../providers/calendar_providers.dart';

/// カレンダーイベント管理コントローラー
class CalendarController extends AutoDisposeAsyncNotifier<List<CalendarEvent>> {
  CalendarRepository get _repo => ref.read(calendarRepositoryProvider);

  @override
  Future<List<CalendarEvent>> build() async {
    final date = ref.watch(selectedDateProvider);
    final start = DateTime(date.year, date.month, date.day);
    final end = DateTime(date.year, date.month, date.day, 23, 59, 59);
    return _repo.getEvents(start: start, end: end);
  }

  /// イベント作成
  Future<void> createEvent(CalendarEvent event) async {
    await _repo.createEvent(event);
    _invalidateAll();
  }

  /// イベント更新
  Future<void> updateEvent(CalendarEvent event) async {
    await _repo.updateEvent(event);
    _invalidateAll();
  }

  /// イベント削除
  Future<void> deleteEvent(String id) async {
    await _repo.deleteEvent(id);
    _invalidateAll();
  }

  /// 今日にフォーカス
  void goToToday() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    ref.read(selectedDateProvider.notifier).state = today;
    ref.read(focusedMonthProvider.notifier).state =
        DateTime(now.year, now.month);
  }

  void _invalidateAll() {
    ref.invalidateSelf();
    final month = ref.read(focusedMonthProvider);
    ref.invalidate(monthEventsProvider(month));
    ref.invalidate(agendaEventsProvider);
    ref.invalidate(eventDatesProvider(month));
  }
}

final calendarControllerProvider =
    AutoDisposeAsyncNotifierProvider<CalendarController, List<CalendarEvent>>(
  CalendarController.new,
);

/// イベントフォーム保存状態コントローラー
class EventFormController extends AutoDisposeNotifier<bool> {
  @override
  bool build() => false; // isSaving

  /// イベント保存（作成 or 更新）
  Future<void> saveEvent(CalendarEvent event, {required bool isNew}) async {
    state = true;
    try {
      final controller = ref.read(calendarControllerProvider.notifier);
      if (isNew) {
        await controller.createEvent(event);
      } else {
        await controller.updateEvent(event);
      }
    } finally {
      state = false;
    }
  }

  /// イベント削除
  Future<void> deleteEvent(String id) async {
    state = true;
    try {
      await ref.read(calendarControllerProvider.notifier).deleteEvent(id);
    } finally {
      state = false;
    }
  }
}

final eventFormControllerProvider =
    AutoDisposeNotifierProvider<EventFormController, bool>(
  EventFormController.new,
);
