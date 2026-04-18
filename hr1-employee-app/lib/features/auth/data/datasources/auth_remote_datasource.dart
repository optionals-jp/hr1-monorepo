import 'dart:io';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/organization_ref.dart';

/// Supabase を使った認証データソース
class AuthRemoteDatasource {
  AuthRemoteDatasource(this._client);

  final SupabaseClient _client;

  /// HR-28 follow-up: active 組織を永続化する SharedPreferences キー
  static String activeOrgKey(String userId) => 'hr1_active_org_$userId';

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
  ///
  /// HR-28 follow-up: ユーザーが所属する全組織を返す。
  /// activeOrganizationId は SharedPreferences から復元し、未設定なら
  /// リスト先頭を選択して保存する。
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

    // user_organizations 経由で全所属組織を取得
    final userOrgRows = await _client
        .from('user_organizations')
        .select('organization_id, organizations!inner(id, name)')
        .eq('user_id', userId);

    final organizations = <OrganizationRef>[];
    for (final row in userOrgRows as List) {
      final org =
          (row as Map<String, dynamic>)['organizations']
              as Map<String, dynamic>?;
      if (org == null) continue;
      organizations.add(OrganizationRef.fromJson(org));
    }

    if (organizations.isEmpty) {
      throw Exception('ユーザーが所属する組織が見つかりません。管理者にお問い合わせください。');
    }

    // SharedPreferences から active を復元
    final prefs = await SharedPreferences.getInstance();
    final storedActive = prefs.getString(activeOrgKey(userId));
    String activeOrgId;
    if (storedActive != null &&
        organizations.any((o) => o.id == storedActive)) {
      activeOrgId = storedActive;
    } else {
      activeOrgId = organizations.first.id;
      await prefs.setString(activeOrgKey(userId), activeOrgId);
    }

    return AppUser(
      id: userId,
      email: email,
      organizations: organizations,
      activeOrganizationId: activeOrgId,
      role: profile['role'] as String? ?? 'employee',
      displayName: profile['display_name'] as String?,
      avatarUrl: profile['avatar_url'] as String?,
      department: profile['department'] as String?,
      position: profile['position'] as String?,
    );
  }

  /// HR-28 follow-up: active 組織を切り替えて永続化
  Future<void> persistActiveOrganization({
    required String userId,
    required String organizationId,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(activeOrgKey(userId), organizationId);
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
