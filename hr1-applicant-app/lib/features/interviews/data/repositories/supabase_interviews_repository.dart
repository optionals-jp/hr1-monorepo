import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/interviews/domain/entities/interview.dart';
import 'package:hr1_applicant_app/features/interviews/domain/repositories/interviews_repository.dart';

/// InterviewsRepository の Supabase 実装
class SupabaseInterviewsRepository implements InterviewsRepository {
  SupabaseInterviewsRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<void> confirmSlot({
    required String slotId,
    required String applicationId,
    String? stepId,
  }) async {
    await _client
        .from('interview_slots')
        .update({'is_selected': true, 'application_id': applicationId})
        .eq('id', slotId);

    // 応募者アクション完了を記録
    if (stepId != null) {
      await _client
          .from('application_steps')
          .update({'applicant_action_at': DateTime.now().toIso8601String()})
          .eq('id', stepId);
    }
  }

  @override
  Future<Interview?> getInterview(String interviewId) async {
    try {
      final response = await _client
          .from('interviews')
          .select('*, interview_slots(*)')
          .eq('id', interviewId)
          .maybeSingle();

      if (response == null) return null;
      final map = Map<String, dynamic>.from(response);
      // interview_slots を slots にリネーム
      map['slots'] = map['interview_slots'] ?? [];
      map.remove('interview_slots');
      return Interview.fromJson(map);
    } catch (e, stackTrace) {
      debugPrint('Error fetching interview $interviewId: $e');
      debugPrint('$stackTrace');
      rethrow;
    }
  }
}
