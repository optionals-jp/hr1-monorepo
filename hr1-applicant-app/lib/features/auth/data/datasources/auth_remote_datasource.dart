import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/app_user.dart';

/// Supabase を使った認証データソース
class AuthRemoteDatasource {
  AuthRemoteDatasource(this._client);

  final SupabaseClient _client;

  /// メール・パスワードでログイン
  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    return _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  /// ログアウト
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// 現在のユーザープロフィールを取得
  Future<AppUser> fetchCurrentUserProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      throw Exception('ユーザーが認証されていません');
    }

    final response = await _client
        .from('user_profiles')
        .select()
        .eq('id', userId)
        .single();

    return AppUser.fromJson(response);
  }

  /// 認証状態の変更を監視
  Stream<AuthState> watchAuthState() {
    return _client.auth.onAuthStateChange;
  }
}
