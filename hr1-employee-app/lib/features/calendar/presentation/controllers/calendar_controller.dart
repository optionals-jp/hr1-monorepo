import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/calendar_event.dart';
import '../../domain/repositories/calendar_repository.dart';
import '../providers/calendar_providers.dart';

/// カレンダーイベント管理コントローラー
///
/// イベントの CRUD 操作と日付ナビゲーションを担当。
/// イベント取得はビュー側で dayEventsProvider を使用する。
class CalendarController extends AutoDisposeNotifier<void> {
  CalendarRepository get _repo => ref.read(calendarRepositoryProvider);

  @override
  void build() {}

  /// イベント作成
  Future<void> createEvent(CalendarEvent event) async {
    await _repo.createEvent(event);
    _invalidateEventCaches();
  }

  /// イベント更新
  Future<void> updateEvent(CalendarEvent event) async {
    await _repo.updateEvent(event);
    _invalidateEventCaches();
  }

  /// イベント削除
  Future<void> deleteEvent(String id) async {
    await _repo.deleteEvent(id);
    _invalidateEventCaches();
  }

  /// 今日にフォーカス
  void goToToday() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    ref.read(focusedMonthProvider.notifier).state = DateTime(
      now.year,
      now.month,
    );
    ref.read(selectedDateProvider.notifier).state = today;
  }

  /// 日付選択
  void selectDate(DateTime date) {
    final focusedMonth = ref.read(focusedMonthProvider);
    if (date.month != focusedMonth.month || date.year != focusedMonth.year) {
      ref.read(focusedMonthProvider.notifier).state = DateTime(
        date.year,
        date.month,
      );
    }
    ref.read(selectedDateProvider.notifier).state = date;
  }

  /// 月変更
  void changeFocusedMonth(DateTime month) {
    ref.read(focusedMonthProvider.notifier).state = month;
  }

  /// ビューモード変更
  void changeViewMode(CalendarViewMode mode) {
    ref.read(calendarViewModeProvider.notifier).state = mode;
  }

  void _invalidateEventCaches() {
    final date = ref.read(selectedDateProvider);
    final month = ref.read(focusedMonthProvider);
    ref.invalidate(dayEventsProvider(date));
    ref.invalidate(eventDatesProvider(month));
  }
}

final calendarControllerProvider =
    AutoDisposeNotifierProvider<CalendarController, void>(
      CalendarController.new,
    );

/// イベントフォーム保存状態コントローラー
class EventFormController extends AutoDisposeNotifier<bool> {
  @override
  bool build() => false; // isSaving

  CalendarController get _controller =>
      ref.read(calendarControllerProvider.notifier);

  /// フォームデータからイベントを構築して保存
  Future<void> saveFromForm({
    required CalendarEvent? existingEvent,
    required String title,
    required String description,
    required String location,
    required DateTime startDate,
    required TimeOfDay startTime,
    required DateTime endDate,
    required TimeOfDay endTime,
    required bool isAllDay,
    required String categoryColor,
  }) async {
    final startAt = isAllDay
        ? DateTime(startDate.year, startDate.month, startDate.day)
        : DateTime(
            startDate.year,
            startDate.month,
            startDate.day,
            startTime.hour,
            startTime.minute,
          );
    final endAt = isAllDay
        ? DateTime(endDate.year, endDate.month, endDate.day, 23, 59, 59)
        : DateTime(
            endDate.year,
            endDate.month,
            endDate.day,
            endTime.hour,
            endTime.minute,
          );

    final trimmedDesc = description.trim();
    final trimmedLocation = location.trim();

    state = true;
    try {
      if (existingEvent != null) {
        await _controller.updateEvent(
          existingEvent.copyWith(
            title: title,
            description: trimmedDesc.isEmpty ? null : trimmedDesc,
            clearDescription: trimmedDesc.isEmpty,
            startAt: startAt,
            endAt: endAt,
            isAllDay: isAllDay,
            location: trimmedLocation.isEmpty ? null : trimmedLocation,
            clearLocation: trimmedLocation.isEmpty,
            categoryColor: categoryColor,
          ),
        );
      } else {
        await _controller.createEvent(
          CalendarEvent(
            id: '',
            userId: '',
            organizationId: '',
            title: title,
            description: trimmedDesc.isEmpty ? null : trimmedDesc,
            startAt: startAt,
            endAt: endAt,
            isAllDay: isAllDay,
            location: trimmedLocation.isEmpty ? null : trimmedLocation,
            categoryColor: categoryColor,
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          ),
        );
      }
    } finally {
      state = false;
    }
  }

  /// イベント削除
  Future<void> deleteEvent(String id) async {
    state = true;
    try {
      await _controller.deleteEvent(id);
    } finally {
      state = false;
    }
  }
}

final eventFormControllerProvider =
    AutoDisposeNotifierProvider<EventFormController, bool>(
      EventFormController.new,
    );
