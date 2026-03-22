import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/pulse_survey.dart';

/// パルスサーベイのSupabaseリポジトリ（応募者向け）
class SupabaseSurveyRepository {
  SupabaseSurveyRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> _getOrganizationId() async {
    final row = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .maybeSingle();
    if (row == null) throw StateError('所属する組織が見つかりません');
    return row['organization_id'] as String;
  }

  /// アクティブなサーベイ一覧を取得（応募者向け、期限内のみ）
  Future<List<PulseSurvey>> getActiveSurveys() async {
    final orgId = await _getOrganizationId();
    final now = DateTime.now().toUtc().toIso8601String();
    final response = await _client
        .from('pulse_surveys')
        .select('*, pulse_survey_questions(*)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .inFilter('target', ['applicant', 'both'])
        .or('deadline.is.null,deadline.gte.$now')
        .order('created_at', ascending: false);

    return (response as List).map((json) {
      final survey = PulseSurvey.fromJson(json);
      // 質問をsortOrderでソート
      survey.questions.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
      return survey;
    }).toList();
  }

  /// サーベイIDから単一のサーベイを取得（ディープリンク用）
  Future<PulseSurvey?> getSurveyById(String surveyId) async {
    final response = await _client
        .from('pulse_surveys')
        .select('*, pulse_survey_questions(*)')
        .eq('id', surveyId)
        .maybeSingle();
    if (response == null) return null;
    final survey = PulseSurvey.fromJson(response);
    survey.questions.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return survey;
  }

  /// 自分の回答状況を取得（回答済みサーベイIDの一覧）
  Future<Set<String>> getCompletedSurveyIds() async {
    final response = await _client
        .from('pulse_survey_responses')
        .select('survey_id')
        .eq('user_id', _userId)
        .not('completed_at', 'is', null);

    return (response as List).map((r) => r['survey_id'] as String).toSet();
  }

  /// 自分の回答内容を取得
  Future<Map<String, String>> getMyAnswers(String surveyId) async {
    final response = await _client
        .from('pulse_survey_responses')
        .select('id')
        .eq('survey_id', surveyId)
        .eq('user_id', _userId)
        .maybeSingle();
    if (response == null) return {};

    final responseId = response['id'] as String;
    final answers = await _client
        .from('pulse_survey_answers')
        .select('question_id, value')
        .eq('response_id', responseId);

    return {
      for (final a in answers as List)
        a['question_id'] as String: a['value'] as String? ?? '',
    };
  }

  /// サーベイに回答を送信（RPC経由でアトミックに実行）
  Future<void> submitResponse({
    required String surveyId,
    required Map<String, String> answers,
  }) async {
    final answersList = answers.entries
        .map((e) => {'question_id': e.key, 'value': e.value})
        .toList();

    await _client.rpc(
      'submit_survey_response',
      params: {'p_survey_id': surveyId, 'p_answers': answersList},
    );
  }
}
