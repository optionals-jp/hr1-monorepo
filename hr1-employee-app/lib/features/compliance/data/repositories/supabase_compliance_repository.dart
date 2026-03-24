import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/compliance/domain/entities/compliance_alert.dart';

class SupabaseComplianceRepository {
  SupabaseComplianceRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<List<ComplianceAlert>> getMyAlerts() async {
    final response = await _client
        .from('compliance_alerts')
        .select()
        .eq('user_id', _userId)
        .eq('is_resolved', false)
        .order('created_at', ascending: false)
        .limit(10);

    return (response as List)
        .map((json) => ComplianceAlert.fromJson(json))
        .toList();
  }
}
