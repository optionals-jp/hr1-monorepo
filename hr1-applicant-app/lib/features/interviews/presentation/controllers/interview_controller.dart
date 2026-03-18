import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../applications/presentation/providers/applications_providers.dart';
import '../providers/interviews_providers.dart';

/// 面接スロット確定の状態
class InterviewConfirmState {
  const InterviewConfirmState({
    this.isSubmitting = false,
    this.error,
    this.confirmed = false,
  });

  final bool isSubmitting;
  final String? error;
  final bool confirmed;
}

/// 面接スロット確定コントローラー
class InterviewController
    extends AutoDisposeFamilyNotifier<InterviewConfirmState, String> {
  @override
  InterviewConfirmState build(String arg) => const InterviewConfirmState();

  /// スロットを確定して関連プロバイダーを再取得
  Future<void> confirmSlot({
    required String slotId,
    required String applicationId,
    String? stepId,
  }) async {
    final interviewId = arg;
    state = const InterviewConfirmState(isSubmitting: true);

    try {
      final repo = ref.read(interviewsRepositoryProvider);
      await repo.confirmSlot(slotId: slotId, applicationId: applicationId);

      // ステップを完了に更新し、次のステップを自動開始
      if (stepId != null) {
        final appRepo = ref.read(applicationsRepositoryProvider);
        await appRepo.completeStep(stepId, applicationId);
      }

      // 関連プロバイダーを無効化して再取得
      ref.invalidate(selectedSlotProvider(interviewId));
      ref.invalidate(interviewDetailProvider(interviewId));
      ref.invalidate(applicationsProvider);
      ref.invalidate(applicationDetailProvider(applicationId));

      state = const InterviewConfirmState(confirmed: true);
    } catch (e) {
      state = const InterviewConfirmState(
        error: '面接日程の確定に失敗しました。しばらくしてから再度お試しください',
      );
    }
  }
}

/// 面接コントローラープロバイダー
final interviewControllerProvider =
    AutoDisposeNotifierProvider.family<
      InterviewController,
      InterviewConfirmState,
      String
    >(InterviewController.new);
