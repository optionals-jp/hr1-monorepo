import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_survey_repository.dart';
import '../../domain/entities/pulse_survey.dart';

/// サーベイリポジトリプロバイダー
final surveyRepositoryProvider = Provider<SupabaseSurveyRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseSurveyRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// アクティブサーベイ一覧プロバイダー
final activeSurveysProvider = FutureProvider.autoDispose<List<PulseSurvey>>((
  ref,
) async {
  final repo = ref.watch(surveyRepositoryProvider);
  return repo.getActiveSurveys();
});

/// 回答済みサーベイIDプロバイダー
final completedSurveyIdsProvider = FutureProvider.autoDispose<Set<String>>((
  ref,
) async {
  final repo = ref.watch(surveyRepositoryProvider);
  return repo.getCompletedSurveyIds();
});

/// 未回答サーベイ一覧プロバイダー
final pendingSurveysProvider = FutureProvider.autoDispose<List<PulseSurvey>>((
  ref,
) async {
  final surveys = await ref.watch(activeSurveysProvider.future);
  final completedIds = await ref.watch(completedSurveyIdsProvider.future);
  return surveys.where((s) => !completedIds.contains(s.id)).toList();
});

/// 回答済みサーベイ一覧プロバイダー
final completedSurveysProvider = FutureProvider.autoDispose<List<PulseSurvey>>((
  ref,
) async {
  final surveys = await ref.watch(activeSurveysProvider.future);
  final completedIds = await ref.watch(completedSurveyIdsProvider.future);
  return surveys.where((s) => completedIds.contains(s.id)).toList();
});

/// サーベイID指定取得プロバイダー（ディープリンク用）
final surveyByIdProvider = FutureProvider.autoDispose
    .family<PulseSurvey?, String>((ref, surveyId) async {
      final repo = ref.watch(surveyRepositoryProvider);
      return repo.getSurveyById(surveyId);
    });
