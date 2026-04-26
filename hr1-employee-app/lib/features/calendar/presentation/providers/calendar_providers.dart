import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/calendar/data/repositories/supabase_calendar_repository.dart';
import 'package:hr1_employee_app/features/calendar/domain/entities/calendar_event.dart';
import 'package:hr1_employee_app/features/calendar/domain/repositories/calendar_repository.dart';

/// カレンダーリポジトリプロバイダー
final calendarRepositoryProvider = Provider<CalendarRepository>((ref) {
  return SupabaseCalendarRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
  );
});

/// 選択中の日付
final selectedDateProvider = StateProvider<DateTime>((ref) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day);
});

/// フォーカス中の月
final focusedMonthProvider = StateProvider<DateTime>((ref) {
  final now = DateTime.now();
  return DateTime(now.year, now.month);
});

/// カレンダービューモード
enum CalendarViewMode { agenda, day, threeDay }

final calendarViewModeProvider = StateProvider<CalendarViewMode>(
  (ref) => CalendarViewMode.agenda,
);

/// 指定日のイベント取得（PageView用）
final dayEventsProvider = FutureProvider.autoDispose
    .family<List<CalendarEvent>, DateTime>((ref, date) async {
      final repo = ref.watch(calendarRepositoryProvider);
      final start = DateTime(date.year, date.month, date.day);
      final end = DateTime(date.year, date.month, date.day, 23, 59, 59);
      return repo.getEvents(start: start, end: end);
    });

/// 月のイベント日付セット（カレンダードット表示用）
final eventDatesProvider = FutureProvider.autoDispose
    .family<Set<DateTime>, DateTime>((ref, month) async {
      final repo = ref.watch(calendarRepositoryProvider);
      final start = DateTime(month.year, month.month, 1);
      final end = DateTime(month.year, month.month + 1, 0, 23, 59, 59);
      return repo.getEventDates(start: start, end: end);
    });
