import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/attendance/data/repositories/supabase_attendance_repository.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';

/// 打刻操作の状態。
///
/// [pendingAction] は現在進行中の打刻アクション名 (`clock_in` / `clock_out` /
/// `break_start` / `break_end`)。null なら待機中。
///
/// [errorMessage] はユーザーに表示する日本語の打刻失敗理由。失敗時のみ非 null。
class PunchState {
  const PunchState({this.pendingAction, this.errorMessage});
  final String? pendingAction;
  final String? errorMessage;

  bool get isLoading => pendingAction != null;
}

/// 勤怠打刻コントローラー
///
/// 打刻操作（出勤・退勤・休憩開始・休憩終了）のビジネスロジックを管理する。
/// 不変条件 (二重出勤・休憩中の退勤・出勤前の休憩 等) は DB の SECURITY
/// DEFINER RPC が atomic に弾く。ここでは「処理中なら新規 punch を受け付け
/// ない」UI ガードのみを担う。
class AttendanceController extends AutoDisposeNotifier<PunchState> {
  @override
  PunchState build() => const PunchState();

  /// 打刻実行。何らかの punch が処理中なら拒否 (UI ガード)。
  /// 業務上の状態違反は DB 由来の [PunchException] を日本語に変換して
  /// [PunchState.errorMessage] にセットする。
  Future<void> punch(String action) async {
    if (state.isLoading) return;
    state = PunchState(pendingAction: action);
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
    } on PunchException catch (e) {
      // 失敗時もサーバ最新状態を反映 (UI を真の状態に戻す)。
      ref.invalidate(todayRecordProvider);
      ref.invalidate(todayPunchesProvider);
      state = PunchState(errorMessage: _messageFromCode(e.code));
    } catch (_) {
      ref.invalidate(todayRecordProvider);
      ref.invalidate(todayPunchesProvider);
      state = const PunchState(errorMessage: '打刻に失敗しました');
    }
  }

  /// RPC の `detail` コードを日本語メッセージに変換。
  static String _messageFromCode(String code) {
    switch (code) {
      case 'unauthenticated':
        return 'ログインし直してください';
      case 'forbidden_organization':
        return '組織を切り替えてから再度お試しください';
      case 'already_clocked_in':
        return 'すでに出勤済みです';
      case 'not_clocked_in':
        return '出勤打刻がありません';
      case 'already_clocked_out':
        return 'すでに退勤済みです';
      case 'on_break_cannot_clock_out':
        return '休憩中は退勤できません。先に休憩を終了してください';
      case 'already_on_break':
        return 'すでに休憩中です';
      case 'not_on_break':
        return '休憩中ではありません';
      default:
        return '打刻に失敗しました';
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
