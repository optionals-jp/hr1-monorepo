import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_type.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_request.dart';
import 'package:hr1_employee_app/features/shifts/presentation/providers/shift_providers.dart';

/// シフト希望提出の状態
class ShiftRequestState {
  const ShiftRequestState({
    this.isSubmitting = false,
    this.error,
    this.submitted = false,
  });

  final bool isSubmitting;
  final String? error;
  final bool submitted;
}

/// シフト希望提出コントローラー
class ShiftRequestController extends AutoDisposeNotifier<ShiftRequestState> {
  @override
  ShiftRequestState build() => const ShiftRequestState();

  /// 編集データからリクエストを生成して提出
  Future<void> submit({
    required int year,
    required int month,
    required Map<String, DayShift> edits,
  }) async {
    state = const ShiftRequestState(isSubmitting: true);
    try {
      final repo = ref.read(shiftRepositoryProvider);
      final orgId = ref.read(activeOrganizationIdProvider);
      final userId = repo.userId;

      final requests = edits.entries.map((e) {
        return ShiftRequest(
          userId: userId,
          organizationId: orgId,
          targetDate: e.key,
          startTime: e.value.isAvailable ? e.value.startTime : null,
          endTime: e.value.isAvailable ? e.value.endTime : null,
          isAvailable: e.value.isAvailable,
        );
      }).toList();

      await repo.upsertRequests(requests);
      await repo.submitRequests(year, month);
      ref.invalidate(shiftRequestsProvider((year: year, month: month)));
      state = const ShiftRequestState(submitted: true);
    } catch (e) {
      state = ShiftRequestState(error: e.toString());
    }
  }
}

final shiftRequestControllerProvider =
    AutoDisposeNotifierProvider<ShiftRequestController, ShiftRequestState>(
      ShiftRequestController.new,
    );
