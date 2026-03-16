import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_attendance_repository.dart';
import '../../domain/entities/attendance_record.dart';

/// リポジトリプロバイダー
final attendanceRepositoryProvider =
    Provider<SupabaseAttendanceRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseAttendanceRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// 今日の勤怠レコードプロバイダー
final todayRecordProvider = FutureProvider<AttendanceRecord?>((ref) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getTodayRecord();
});

/// 今日の打刻履歴プロバイダー
final todayPunchesProvider = FutureProvider<List<AttendancePunch>>((ref) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getTodayPunches();
});

/// 勤怠設定プロバイダー
final attendanceSettingsProvider =
    FutureProvider<AttendanceSettings>((ref) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getSettings();
});

/// 月間勤怠レコードプロバイダー
final monthlyRecordsProvider = FutureProvider.family<List<AttendanceRecord>,
    ({int year, int month})>((ref, params) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  final startDate =
      '${params.year}-${params.month.toString().padLeft(2, '0')}-01';
  final lastDay =
      DateTime(params.year, params.month + 1, 0).day;
  final endDate =
      '${params.year}-${params.month.toString().padLeft(2, '0')}-$lastDay';
  return repo.getRecords(startDate: startDate, endDate: endDate);
});

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
