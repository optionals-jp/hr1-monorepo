import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../todos/presentation/providers/todo_providers.dart';
import '../providers/survey_providers.dart';

/// サーベイ回答送信の状態
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

/// サーベイ回答送信コントローラー
class SurveyAnswerController extends AutoDisposeNotifier<SurveySubmitState> {
  @override
  SurveySubmitState build() => const SurveySubmitState();

  /// 回答を送信
  Future<void> submit({
    required String surveyId,
    required Map<String, String> answers,
  }) async {
    state = const SurveySubmitState(isSubmitting: true);
    try {
      final repo = ref.read(surveyRepositoryProvider);
      await repo.submitResponse(surveyId: surveyId, answers: answers);
      ref.invalidate(completedSurveyIdsProvider);
      ref.invalidate(incompleteTodosProvider);
      ref.invalidate(allTodosProvider);
      ref.invalidate(incompleteTodoCountProvider);
      state = const SurveySubmitState(submitted: true);
    } catch (e) {
      state = const SurveySubmitState(error: '送信に失敗しました。しばらくしてから再度お試しください');
    }
  }
}

final surveyAnswerControllerProvider =
    AutoDisposeNotifierProvider<SurveyAnswerController, SurveySubmitState>(
      SurveyAnswerController.new,
    );
