import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_request.dart';

/// シフト管理のSupabaseリポジトリ
class SupabaseShiftRepository {
  SupabaseShiftRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> getOrganizationId() async {
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .single();
    return userOrg['organization_id'] as String;
  }

  /// 自分のシフト希望を取得（月単位）
  Future<List<ShiftRequest>> getMyRequests(int year, int month) async {
    final orgId = await getOrganizationId();
    final startDate = '$year-${month.toString().padLeft(2, '0')}-01';
    final lastDay = DateTime(year, month + 1, 0).day;
    final endDate = '$year-${month.toString().padLeft(2, '0')}-$lastDay';

    final data = await _client
        .from('shift_requests')
        .select()
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date');

    return (data as List).map((e) => ShiftRequest.fromJson(e)).toList();
  }

  /// シフト希望を一括保存（upsert）
  Future<void> upsertRequests(List<ShiftRequest> requests) async {
    if (requests.isEmpty) return;
    final data = requests.map((r) => r.toJson()).toList();
    await _client
        .from('shift_requests')
        .upsert(data, onConflict: 'user_id,organization_id,target_date');
  }

  /// シフト希望を提出（submitted_at を設定）
  Future<void> submitRequests(int year, int month) async {
    final orgId = await getOrganizationId();
    final startDate = '$year-${month.toString().padLeft(2, '0')}-01';
    final lastDay = DateTime(year, month + 1, 0).day;
    final endDate = '$year-${month.toString().padLeft(2, '0')}-$lastDay';

    await _client
        .from('shift_requests')
        .update({'submitted_at': DateTime.now().toIso8601String()})
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .gte('target_date', startDate)
        .lte('target_date', endDate);
  }

  /// 確定シフトを取得（月単位）
  Future<List<ShiftSchedule>> getMySchedules(int year, int month) async {
    final orgId = await getOrganizationId();
    final startDate = '$year-${month.toString().padLeft(2, '0')}-01';
    final lastDay = DateTime(year, month + 1, 0).day;
    final endDate = '$year-${month.toString().padLeft(2, '0')}-$lastDay';

    final data = await _client
        .from('shift_schedules')
        .select()
        .eq('user_id', userId)
        .eq('organization_id', orgId)
        .eq('status', 'published')
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date');

    return (data as List).map((e) => ShiftSchedule.fromJson(e)).toList();
  }
}
