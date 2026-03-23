import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';

class SurveySubmitState {
  const SurveySubmitState({
    this.isSubmitting = false,
    this.error,
    this.submitted = false,
  });

  final bool isSubmitting;
  final String? error;
  final bool submitted;
}

class SurveyAnswerController extends AutoDisposeNotifier<SurveySubmitState> {
  @override
  SurveySubmitState build() => const SurveySubmitState();

  Future<void> submit({
    required String surveyId,
    required Map<String, String> answers,
  }) async {
    state = const SurveySubmitState(isSubmitting: true);
    try {
      final repo = ref.read(surveyRepositoryProvider);
      await repo.submitResponse(surveyId: surveyId, answers: answers);
      ref.invalidate(completedSurveyIdsProvider);
      state = const SurveySubmitState(submitted: true);
    } catch (e, st) {
      debugPrint('=== サーベイ送信エラー ===');
      debugPrint('Error: $e');
      debugPrint('StackTrace: $st');
      state = SurveySubmitState(error: '送信に失敗しました: $e');
    }
  }
}

final surveyAnswerControllerProvider =
    AutoDisposeNotifierProvider<SurveyAnswerController, SurveySubmitState>(
      SurveyAnswerController.new,
    );
