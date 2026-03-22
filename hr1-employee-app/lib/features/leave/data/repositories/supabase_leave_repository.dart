import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/leave/domain/entities/leave_balance.dart';

class SupabaseLeaveRepository {
  SupabaseLeaveRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  /// 全年度の残日数を取得
  Future<List<LeaveBalance>> getBalances() async {
    final response = await _client
        .from('leave_balances')
        .select()
        .eq('user_id', _userId)
        .order('fiscal_year', ascending: false);

    return (response as List)
        .map((json) => LeaveBalance.fromJson(json))
        .toList();
  }

  /// 当年度の残日数を取得
  Future<LeaveBalance?> getCurrentBalance() async {
    final currentYear = DateTime.now().year;
    final response = await _client
        .from('leave_balances')
        .select()
        .eq('user_id', _userId)
        .eq('fiscal_year', currentYear)
        .maybeSingle();

    if (response == null) return null;
    return LeaveBalance.fromJson(response);
  }
}
