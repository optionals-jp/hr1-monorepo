import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/entities/organization.dart';
import '../../domain/entities/user_role.dart';

/// Supabase を使った認証データソース
class AuthRemoteDatasource {
  AuthRemoteDatasource(this._client);

  final SupabaseClient _client;

  /// メールアドレスにOTPを送信
  Future<void> signInWithOtp({required String email}) async {
    await _client.auth.signInWithOtp(email: email);
  }

  /// OTPを検証してログイン
  Future<AuthResponse> verifyOtp({
    required String email,
    required String token,
  }) async {
    return _client.auth.verifyOTP(
      email: email,
      token: token,
      type: OtpType.email,
    );
  }

  /// ログアウト
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// 現在の認証ユーザーのプロフィールと所属企業を取得
  /// プロフィールが存在しない場合は自動作成する
  Future<AppUser> fetchCurrentUserProfile() async {
    final authUser = _client.auth.currentUser;
    if (authUser == null) {
      throw Exception('ユーザーが認証されていません');
    }

    final userId = authUser.id;
    final email = authUser.email ?? '';

    // プロフィール取得（なければ作成）
    var profileResponse = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

    if (profileResponse == null) {
      await _client.from('profiles').insert({
        'id': userId,
        'email': email,
        'role': 'applicant',
      });
      profileResponse = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
    }

    // user_organizations 経由で所属企業を取得
    final userOrgs = await _client
        .from('user_organizations')
        .select('organization_id, organizations(*)')
        .eq('user_id', userId);

    final orgs = (userOrgs as List)
        .map(
          (row) => Organization.fromJson(
            Map<String, dynamic>.from(row['organizations']),
          ),
        )
        .toList();

    return AppUser(
      id: profileResponse['id'] as String,
      email: profileResponse['email'] as String,
      displayName: profileResponse['display_name'] as String?,
      role: UserRole.values.byName(profileResponse['role'] as String),
      organizations: orgs,
    );
  }

  /// 認証状態の変更を監視
  Stream<AuthState> watchAuthState() {
    return _client.auth.onAuthStateChange;
  }

  /// 現在認証済みかどうか
  bool get isAuthenticated => _client.auth.currentSession != null;
}
