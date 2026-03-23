import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_shared/hr1_shared.dart' show MonthUtils;
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/attendance/data/repositories/supabase_attendance_repository.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';

/// リポジトリプロバイダー
final attendanceRepositoryProvider = Provider<SupabaseAttendanceRepository>((
  ref,
) {
  final user = ref.watch(appUserProvider);
  return SupabaseAttendanceRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// 今日の勤怠レコードプロバイダー
final todayRecordProvider = FutureProvider.autoDispose<AttendanceRecord?>((
  ref,
) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getTodayRecord();
});

/// 今日の打刻履歴プロバイダー
final todayPunchesProvider = FutureProvider.autoDispose<List<AttendancePunch>>((
  ref,
) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getTodayPunches();
});

/// 指定日の打刻履歴プロバイダー
final punchesByDateProvider = FutureProvider.autoDispose
    .family<List<AttendancePunch>, DateTime>((ref, date) async {
      final repo = ref.watch(attendanceRepositoryProvider);
      return repo.getPunchesByDate(date);
    });

/// 勤怠設定プロバイダー
final attendanceSettingsProvider =
    FutureProvider.autoDispose<AttendanceSettings>((ref) async {
      final repo = ref.watch(attendanceRepositoryProvider);
      return repo.getSettings();
    });

/// 月間勤怠レコードプロバイダー
final monthlyRecordsProvider = FutureProvider.autoDispose
    .family<List<AttendanceRecord>, ({int year, int month})>((
      ref,
      params,
    ) async {
      final repo = ref.watch(attendanceRepositoryProvider);
      final startDate =
          '${params.year}-${params.month.toString().padLeft(2, '0')}-01';
      final lastDay = DateTime(params.year, params.month + 1, 0).day;
      final endDate =
          '${params.year}-${params.month.toString().padLeft(2, '0')}-$lastDay';
      return repo.getRecords(startDate: startDate, endDate: endDate);
    });

/// 勤怠明細画面の選択月プロバイダー
final selectedMonthProvider =
    AutoDisposeNotifierProvider<SelectedMonthNotifier, ({int year, int month})>(
      SelectedMonthNotifier.new,
    );

class SelectedMonthNotifier
    extends AutoDisposeNotifier<({int year, int month})> {
  @override
  ({int year, int month}) build() {
    final now = DateTime.now();
    return (year: now.year, month: now.month);
  }

  void prevMonth() {
    final prev = MonthUtils.prevMonth(state.year, state.month);
    state = prev;
  }

  void nextMonth() {
    if (MonthUtils.isCurrentMonth(state.year, state.month)) return;
    final next = MonthUtils.nextMonth(state.year, state.month);
    state = next;
  }
}

/// 月次勤怠サマリーデータ
class MonthlySummary {
  const MonthlySummary({
    required this.totalWorkMinutes,
    required this.totalOvertimeMinutes,
    required this.totalLateNightMinutes,
    required this.workDayCount,
    required this.lateEarlyCount,
  });

  final int totalWorkMinutes;
  final int totalOvertimeMinutes;
  final int totalLateNightMinutes;
  final int workDayCount;
  final int lateEarlyCount;
}

/// 日別表示データ
class DayData {
  const DayData({
    required this.date,
    required this.dateStr,
    this.record,
    this.isWeekend = false,
  });

  final DateTime date;
  final String dateStr;
  final AttendanceRecord? record;
  final bool isWeekend;
}

/// 月次サマリープロバイダー
final monthlySummaryProvider = Provider.autoDispose
    .family<AsyncValue<MonthlySummary>, ({int year, int month})>((ref, params) {
      return ref.watch(monthlyRecordsProvider(params)).whenData(_calcSummary);
    });

MonthlySummary _calcSummary(List<AttendanceRecord> records) {
  int totalWorkMinutes = 0;
  int totalOvertimeMinutes = 0;
  int totalLateNightMinutes = 0;
  int workDayCount = 0;
  int lateEarlyCount = 0;

  for (final r in records) {
    totalWorkMinutes += r.workMinutes;
    totalOvertimeMinutes += r.overtimeMinutes;
    totalLateNightMinutes += r.lateNightMinutes;

    if (r.status == AttendanceStatus.present ||
        r.status == AttendanceStatus.late ||
        r.status == AttendanceStatus.earlyLeave) {
      workDayCount++;
    }
    if (r.status == AttendanceStatus.late ||
        r.status == AttendanceStatus.earlyLeave) {
      lateEarlyCount++;
    }
  }

  return MonthlySummary(
    totalWorkMinutes: totalWorkMinutes,
    totalOvertimeMinutes: totalOvertimeMinutes,
    totalLateNightMinutes: totalLateNightMinutes,
    workDayCount: workDayCount,
    lateEarlyCount: lateEarlyCount,
  );
}

/// 日別一覧データプロバイダー
final monthlyDayListProvider = Provider.autoDispose
    .family<AsyncValue<List<DayData>>, ({int year, int month})>((ref, params) {
      return ref
          .watch(monthlyRecordsProvider(params))
          .whenData(
            (records) => _buildDayList(records, params.year, params.month),
          );
    });

List<DayData> _buildDayList(
  List<AttendanceRecord> records,
  int year,
  int month,
) {
  final lastDay = DateTime(year, month + 1, 0).day;
  final recordMap = <String, AttendanceRecord>{};
  for (final r in records) {
    recordMap[r.date] = r;
  }

  final days = <DayData>[];
  for (var d = 1; d <= lastDay; d++) {
    final date = DateTime(year, month, d);
    final dateStr =
        '$year-${month.toString().padLeft(2, '0')}-${d.toString().padLeft(2, '0')}';
    final record = recordMap[dateStr];
    final isWeekend =
        date.weekday == DateTime.saturday || date.weekday == DateTime.sunday;
    days.add(
      DayData(
        date: date,
        dateStr: dateStr,
        record: record,
        isWeekend: isWeekend,
      ),
    );
  }
  return days;
}

/// 勤怠状態管理（出勤中・休憩中などの状態を管理）
enum WorkState { notStarted, working, onBreak, finished }

final workStateProvider = Provider<WorkState>((ref) {
  final recordAsync = ref.watch(todayRecordProvider);
  final punchesAsync = ref.watch(todayPunchesProvider);

  return recordAsync.when(
    data: (record) {
      if (record == null) return WorkState.notStarted;
      if (record.clockOut != null) return WorkState.finished;

      // 休憩中かどうか打刻履歴で判定
      return punchesAsync.when(
        data: (punches) {
          final breakStarts = punches
              .where((p) => p.punchType == PunchType.breakStart)
              .length;
          final breakEnds = punches
              .where((p) => p.punchType == PunchType.breakEnd)
              .length;
          if (breakStarts > breakEnds) return WorkState.onBreak;
          return WorkState.working;
        },
        loading: () => WorkState.working,
        error: (_, __) => WorkState.working,
      );
    },
    loading: () => WorkState.notStarted,
    error: (_, __) => WorkState.notStarted,
  );
});
