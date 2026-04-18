import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/payslips/domain/entities/payslip.dart';

class SupabasePayslipRepository {
  SupabasePayslipRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  /// 給与明細一覧を取得（年でフィルタ可能）
  Future<List<Payslip>> getPayslips({int? year}) async {
    var query = _client
        .from('payslips')
        .select()
        .eq('user_id', _userId)
        .order('year', ascending: false)
        .order('month', ascending: false);

    if (year != null) {
      query = _client
          .from('payslips')
          .select()
          .eq('user_id', _userId)
          .eq('year', year)
          .order('month', ascending: false);
    }

    final response = await query;
    return (response as List).map((json) => Payslip.fromJson(json)).toList();
  }

  /// 給与明細詳細を取得
  Future<Payslip?> getPayslipById(String id) async {
    // HR-28: RLS に加えて user_id を明示フィルタ（defense-in-depth）
    final response = await _client
        .from('payslips')
        .select()
        .eq('id', id)
        .eq('user_id', _userId)
        .maybeSingle();
    if (response == null) return null;
    return Payslip.fromJson(response);
  }

  /// 利用可能な年のリストを取得
  Future<List<int>> getAvailableYears() async {
    final response = await _client
        .from('payslips')
        .select('year')
        .eq('user_id', _userId)
        .order('year', ascending: false);
    final years = (response as List)
        .map((e) => e['year'] as int)
        .toSet()
        .toList();
    return years;
  }
}
