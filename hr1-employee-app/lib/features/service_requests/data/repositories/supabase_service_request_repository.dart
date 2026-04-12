import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// サービスリクエスト リポジトリ
class SupabaseServiceRequestRepository {
  SupabaseServiceRequestRepository(this._client);

  final SupabaseClient _client;

  /// リクエスト一覧を取得
  Future<List<ServiceRequest>> getRequests(String userId) async {
    final response = await _client
        .from('service_requests')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(100);

    return (response as List)
        .map((e) => ServiceRequest.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// リクエストを作成
  Future<void> createRequest({
    required String userId,
    required ServiceRequestType type,
    required String title,
    required String description,
  }) async {
    await _client.from('service_requests').insert({
      'user_id': userId,
      'type': type == ServiceRequestType.bug ? 'bug' : 'feature',
      'title': title,
      'description': description,
    });
  }
}
