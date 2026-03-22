import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';

class SupabaseWorkflowRepository {
  SupabaseWorkflowRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> _getOrganizationId() async {
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return userOrg['organization_id'] as String;
  }

  /// 自分の申請一覧を取得
  Future<List<WorkflowRequest>> getMyRequests({
    WorkflowRequestType? type,
    WorkflowRequestStatus? status,
  }) async {
    var query = _client
        .from('workflow_requests')
        .select()
        .eq('user_id', _userId);

    if (type != null) {
      query = query.eq('request_type', type.dbValue);
    }
    if (status != null) {
      query = query.eq('status', status.name);
    }

    final response = await query.order('created_at', ascending: false);
    return (response as List)
        .map((json) => WorkflowRequest.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  /// 申請詳細を取得
  Future<WorkflowRequest?> getRequestById(String id) async {
    final response = await _client
        .from('workflow_requests')
        .select()
        .eq('id', id)
        .maybeSingle();
    if (response == null) return null;
    return WorkflowRequest.fromJson(response);
  }

  /// 申請を作成
  Future<WorkflowRequest> createRequest({
    required WorkflowRequestType type,
    required Map<String, dynamic> requestData,
    required String reason,
  }) async {
    final orgId = await _getOrganizationId();
    final response = await _client
        .from('workflow_requests')
        .insert({
          'organization_id': orgId,
          'user_id': _userId,
          'request_type': type.dbValue,
          'request_data': requestData,
          'reason': reason,
          'status': 'pending',
        })
        .select()
        .single();
    return WorkflowRequest.fromJson(response);
  }

  /// 申請を取消（pending のみ）
  Future<void> cancelRequest(String id) async {
    await _client
        .from('workflow_requests')
        .update({'status': 'cancelled'})
        .eq('id', id)
        .eq('user_id', _userId)
        .eq('status', 'pending');
  }
}
