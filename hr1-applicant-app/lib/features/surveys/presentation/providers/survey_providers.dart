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
final activeSurveysProvider = FutureProvider<List<PulseSurvey>>((ref) async {
  final repo = ref.watch(surveyRepositoryProvider);
  return repo.getActiveSurveys();
});

/// 回答済みサーベイIDプロバイダー
final completedSurveyIdsProvider = FutureProvider<Set<String>>((ref) async {
  final repo = ref.watch(surveyRepositoryProvider);
  return repo.getCompletedSurveyIds();
});

/// サーベイID指定取得プロバイダー（ディープリンク用）
final surveyByIdProvider = FutureProvider.family<PulseSurvey?, String>((ref, surveyId) async {
  final repo = ref.watch(surveyRepositoryProvider);
  return repo.getSurveyById(surveyId);
});
