import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../applications/presentation/providers/applications_providers.dart';
import '../providers/forms_providers.dart';

/// フォーム送信の状態
class FormFillState {
  const FormFillState({
    this.isSubmitting = false,
    this.error,
    this.submitted = false,
  });

  final bool isSubmitting;
  final String? error;
  final bool submitted;
}

/// フォーム送信コントローラー
class FormFillController
    extends
        AutoDisposeFamilyNotifier<
          FormFillState,
          ({String formId, String applicationId, String? stepId})
        > {
  @override
  FormFillState build(
    ({String formId, String applicationId, String? stepId}) arg,
  ) => const FormFillState();

  /// フォーム回答を送信し、ステップを完了にする
  Future<void> submit() async {
    if (state.isSubmitting) return;
    state = const FormFillState(isSubmitting: true);

    try {
      final formId = arg.formId;
      final applicationId = arg.applicationId;
      final stepId = arg.stepId;

      // 回答をDBに保存
      final answers = ref.read(formAnswersProvider(formId));
      final formsRepo = ref.read(formsRepositoryProvider);
      final appsRepo = ref.read(applicationsRepositoryProvider);
      final client = ref.read(supabaseClientProvider);
      final userId = client.auth.currentUser?.id;

      if (userId != null && answers.isNotEmpty) {
        await formsRepo.submitResponses(
          formId: formId,
          applicantId: userId,
          answers: answers,
        );
      }

      // ステップを完了に更新し、次のステップを自動開始
      if (stepId != null) {
        await appsRepo.completeStep(stepId, applicationId);
      }

      // 関連プロバイダーを無効化して再取得
      ref.invalidate(formAnswersProvider(formId));
      ref.invalidate(applicationsProvider);
      ref.invalidate(applicationDetailProvider(applicationId));

      state = const FormFillState(submitted: true);
    } catch (e) {
      state = const FormFillState(error: '送信に失敗しました。しばらくしてから再度お試しください');
    }
  }
}

/// フォーム送信コントローラープロバイダー
final formFillControllerProvider = NotifierProvider.autoDispose
    .family<
      FormFillController,
      FormFillState,
      ({String formId, String applicationId, String? stepId})
    >(FormFillController.new);
