import 'dart:io';

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

  /// アバター画像をアップロードし、プロフィールを更新して公開URLを返す
  Future<String> uploadAvatar(File file, String extension) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw Exception('ユーザーが認証されていません');

    final path = '$userId/${DateTime.now().millisecondsSinceEpoch}.$extension';

    await _client.storage
        .from('avatars')
        .upload(path, file, fileOptions: const FileOptions(upsert: true));

    final publicUrl = _client.storage.from('avatars').getPublicUrl(path);

    await _client
        .from('profiles')
        .update({'avatar_url': publicUrl})
        .eq('id', userId);

    return publicUrl;
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

  /// 企業を選択（user_organizations に登録）
  /// 既に登録済みの場合は無視する
  Future<void> selectOrganization({
    required String userId,
    required String organizationId,
  }) async {
    try {
      await _client.from('user_organizations').insert({
        'user_id': userId,
        'organization_id': organizationId,
      });
    } on PostgrestException catch (e) {
      // 23505 = unique_violation（既に登録済み）→ 無視
      if (e.code != '23505') rethrow;
    }
  }
}
