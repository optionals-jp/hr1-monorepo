import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/providers/interviews_providers.dart';

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
      await repo.confirmSlot(
        slotId: slotId,
        applicationId: applicationId,
        stepId: stepId,
      );

      // 関連プロバイダーを無効化して再取得
      ref.invalidate(selectedSlotProvider(interviewId));
      ref.invalidate(interviewDetailProvider(interviewId));
      ref.invalidate(applicationsProvider);
      ref.invalidate(applicationDetailProvider(applicationId));

      state = const InterviewConfirmState(confirmed: true);
    } catch (e) {
      final message = e.toString().contains('既に予約')
          ? 'このスロットは既に他の方に予約されました。別の日程を選択してください。'
          : '面接日程の確定に失敗しました。しばらくしてから再度お試しください。';

      // スロット一覧を再取得して最新状態を反映
      ref.invalidate(interviewDetailProvider(interviewId));

      state = InterviewConfirmState(error: message);
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
