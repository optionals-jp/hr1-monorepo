import 'package:supabase_flutter/supabase_flutter.dart';

/// プロフィールデータリポジトリ
class ProfileRepository {
  const ProfileRepository(this._client);

  final SupabaseClient _client;

  /// プロフィールを取得
  Future<Map<String, dynamic>> getProfile(String userId) async {
    final response = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();
    return response;
  }

  /// プロフィールを更新
  Future<void> updateProfile({String? displayName, String? avatarUrl}) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw Exception('ユーザーが認証されていません');

    final updates = <String, dynamic>{
      'updated_at': DateTime.now().toIso8601String(),
    };
    if (displayName != null) updates['display_name'] = displayName;
    if (avatarUrl != null) updates['avatar_url'] = avatarUrl;

    await _client.from('profiles').update(updates).eq('id', userId);
  }
}
