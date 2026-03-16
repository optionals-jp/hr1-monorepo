import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/attendance_providers.dart';

/// 打刻操作の状態
class PunchState {
  const PunchState({this.isLoading = false, this.error});
  final bool isLoading;
  final String? error;

  PunchState copyWith({bool? isLoading, String? error}) {
    return PunchState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
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

  /// 修正依頼を送信
  Future<void> requestCorrection({
    required String recordId,
    String? originalClockIn,
    String? originalClockOut,
    required String requestedClockIn,
    required String requestedClockOut,
    required String reason,
  }) async {
    state = true;
    try {
      final repo = ref.read(attendanceRepositoryProvider);
      await repo.requestCorrection(
        recordId: recordId,
        originalClockIn: originalClockIn,
        originalClockOut: originalClockOut,
        requestedClockIn: requestedClockIn,
        requestedClockOut: requestedClockOut,
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
