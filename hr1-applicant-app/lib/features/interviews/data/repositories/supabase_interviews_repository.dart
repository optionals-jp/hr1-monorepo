import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/interview.dart';
import '../../domain/repositories/interviews_repository.dart';

/// InterviewsRepository の Supabase 実装
class SupabaseInterviewsRepository implements InterviewsRepository {
  SupabaseInterviewsRepository(this._client);

  final SupabaseClient _client;

  @override
  Interview? getInterview(String interviewId) {
    throw UnimplementedError('Use getInterviewAsync instead');
  }

  /// 面接IDから面接情報を非同期取得
  Future<Interview?> getInterviewAsync(String interviewId) async {
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
  }
}
