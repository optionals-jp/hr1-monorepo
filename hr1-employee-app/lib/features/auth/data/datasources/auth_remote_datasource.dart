import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/app_user.dart';

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

  /// 現在のユーザープロフィールを取得（profiles + user_organizations 経由）
  Future<AppUser> fetchCurrentUserProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      throw Exception('ユーザーが認証されていません');
    }

    final email = _client.auth.currentUser?.email ?? '';

    // プロフィール取得
    final profile = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

    if (profile == null) {
      throw Exception('プロフィールが見つかりません');
    }

    // user_organizations 経由で組織情報を取得
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id, organizations(name)')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

    final orgId = userOrg?['organization_id'] as String? ?? '';
    final orgName =
        (userOrg?['organizations'] as Map?)?['name'] as String? ?? '';

    return AppUser(
      id: userId,
      email: email,
      organizationId: orgId,
      organizationName: orgName,
      role: profile['role'] as String? ?? 'employee',
      displayName: profile['display_name'] as String?,
      avatarUrl: profile['avatar_url'] as String?,
      department: profile['department'] as String?,
      position: profile['position'] as String?,
    );
  }

  /// プロフィールのフィールドを更新
  Future<void> updateProfileField({
    required String userId,
    required Map<String, dynamic> fields,
  }) async {
    await _client.from('profiles').update(fields).eq('id', userId);
  }

  /// アバター画像をアップロードして公開URLを返す
  Future<String> uploadAvatar({
    required String userId,
    required File file,
    required String extension,
  }) async {
    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.$extension';
    await _client.storage
        .from('avatars')
        .upload(path, file, fileOptions: const FileOptions(upsert: true));
    return _client.storage.from('avatars').getPublicUrl(path);
  }

  /// 現在のセッションが存在するかを返す
  bool get hasSession => _client.auth.currentSession != null;

  /// 現在の認証ユーザーIDを返す
  String? get currentUserId => _client.auth.currentUser?.id;

  /// 認証状態の変更を監視
  Stream<AuthState> watchAuthState() {
    return _client.auth.onAuthStateChange;
  }
}
