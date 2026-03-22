import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

/// 打刻操作の状態
class PunchState {
  const PunchState({this.isLoading = false, this.error});
  final bool isLoading;
  final String? error;

  PunchState copyWith({bool? isLoading, String? error}) {
    return PunchState(isLoading: isLoading ?? this.isLoading, error: error);
  }
}

/// 勤怠打刻コントローラー
///
/// 打刻操作（出勤・退勤・休憩開始・休憩終了）のビジネスロジックを管理する。
class AttendanceController extends AutoDisposeNotifier<PunchState> {
  @override
  PunchState build() => const PunchState();

  /// 打刻実行
  Future<void> punch(String action) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repo = ref.read(attendanceRepositoryProvider);
      switch (action) {
        case 'clock_in':
          await repo.clockIn();
        case 'clock_out':
          await repo.clockOut();
        case 'break_start':
          await repo.breakStart();
        case 'break_end':
          await repo.breakEnd();
      }
      ref.invalidate(todayRecordProvider);
      ref.invalidate(todayPunchesProvider);
      state = const PunchState();
    } catch (e) {
      state = PunchState(error: e.toString());
    }
  }

  /// データの手動リフレッシュ
  void refresh() {
    ref.invalidate(todayRecordProvider);
    ref.invalidate(todayPunchesProvider);
  }
}

final attendanceControllerProvider =
    AutoDisposeNotifierProvider<AttendanceController, PunchState>(
      AttendanceController.new,
    );

/// 勤怠修正依頼コントローラー
class CorrectionController extends AutoDisposeNotifier<bool> {
  @override
  bool build() => false; // isSubmitting

  DateTime _resolvedPunchTime(
    AttendancePunch punch,
    Map<String, TimeOfDay> correctedTimes,
  ) {
    final corrected = correctedTimes[punch.id];
    if (corrected != null) {
      final local = punch.punchedAt.toLocal();
      return DateTime(
        local.year,
        local.month,
        local.day,
        corrected.hour,
        corrected.minute,
      );
    }
    return punch.punchedAt.toLocal();
  }

  ({int work, int breakMin, int overtime}) calcDurations({
    required List<AttendancePunch> punches,
    required AttendanceSettings settings,
    required Map<String, TimeOfDay> correctedTimes,
  }) {
    DateTime? clockIn;
    DateTime? clockOut;
    int breakMinutes = 0;

    for (final p in punches) {
      final t = _resolvedPunchTime(p, correctedTimes);
      if (p.punchType == PunchType.clockIn) clockIn = t;
      if (p.punchType == PunchType.clockOut) clockOut = t;
    }

    DateTime? breakStart;
    for (final p in punches) {
      final t = _resolvedPunchTime(p, correctedTimes);
      if (p.punchType == PunchType.breakStart) {
        breakStart = t;
      } else if (p.punchType == PunchType.breakEnd && breakStart != null) {
        breakMinutes += t.difference(breakStart).inMinutes;
        breakStart = null;
      }
    }

    if (clockIn == null || clockOut == null) {
      return (work: 0, breakMin: breakMinutes, overtime: 0);
    }

    final totalMinutes = clockOut.difference(clockIn).inMinutes;
    final workMinutes = totalMinutes - breakMinutes;

    final startParts = settings.workStartTime.split(':');
    final endParts = settings.workEndTime.split(':');
    final workStart = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(startParts[0]),
      int.parse(startParts[1]),
    );
    final workEnd = DateTime(
      clockIn.year,
      clockIn.month,
      clockIn.day,
      int.parse(endParts[0]),
      int.parse(endParts[1]),
    );
    final scheduledMinutes = workEnd.difference(workStart).inMinutes;
    final overtime = workMinutes - scheduledMinutes;

    return (
      work: workMinutes > 0 ? workMinutes : 0,
      breakMin: breakMinutes,
      overtime: overtime > 0 ? overtime : 0,
    );
  }

  Future<void> submitCorrection({
    required AttendanceRecord record,
    required List<AttendancePunch> punches,
    required Map<String, TimeOfDay> correctedTimes,
    required String reason,
  }) async {
    state = true;
    try {
      final punchCorrections = <Map<String, dynamic>>[];
      String? requestedClockIn;
      String? requestedClockOut;

      for (final punch in punches) {
        if (!correctedTimes.containsKey(punch.id)) continue;

        final time = correctedTimes[punch.id]!;
        final local = punch.punchedAt.toLocal();
        final correctedDt = DateTime(
          local.year,
          local.month,
          local.day,
          time.hour,
          time.minute,
        );

        punchCorrections.add({
          'punch_id': punch.id,
          'punch_type': punch.punchType,
          'original_punched_at': punch.punchedAt.toUtc().toIso8601String(),
          'requested_punched_at': correctedDt.toUtc().toIso8601String(),
        });

        if (punch.punchType == PunchType.clockIn) {
          requestedClockIn = correctedDt.toUtc().toIso8601String();
        } else if (punch.punchType == PunchType.clockOut) {
          requestedClockOut = correctedDt.toUtc().toIso8601String();
        }
      }

      final resolvedClockIn =
          requestedClockIn ?? record.clockIn?.toIso8601String();
      final resolvedClockOut =
          requestedClockOut ?? record.clockOut?.toIso8601String();

      final repo = ref.read(attendanceRepositoryProvider);
      await repo.requestCorrection(
        recordId: record.id,
        originalClockIn: record.clockIn?.toIso8601String(),
        originalClockOut: record.clockOut?.toIso8601String(),
        requestedClockIn: resolvedClockIn ?? '',
        requestedClockOut: resolvedClockOut ?? '',
        punchCorrections: punchCorrections,
        reason: reason,
      );
    } finally {
      state = false;
    }
  }
}

final correctionControllerProvider =
    AutoDisposeNotifierProvider<CorrectionController, bool>(
      CorrectionController.new,
    );
