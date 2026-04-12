import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';

class SupabaseWikiRepository {
  SupabaseWikiRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;
  String? _cachedOrgId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> _getOrganizationId() async {
    if (_cachedOrgId != null) return _cachedOrgId!;
    final row = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    _cachedOrgId = row['organization_id'] as String;
    return _cachedOrgId!;
  }

  Future<List<WikiPage>> getPublishedPages() async {
    final orgId = await _getOrganizationId();
    final response = await _client
        .from('wiki_pages')
        .select()
        .eq('organization_id', orgId)
        .eq('is_published', true)
        .order('sort_order', ascending: true)
        .order('created_at', ascending: false)
        .limit(200);

    return (response as List).map((json) => WikiPage.fromJson(json)).toList();
  }

  /// タイトル・本文でWikiページを検索
  Future<List<WikiPage>> searchPages(String query) async {
    final orgId = await _getOrganizationId();
    final sanitized = sanitizeForLike(query);
    final pattern = '%$sanitized%';
    final response = await _client
        .from('wiki_pages')
        .select()
        .eq('organization_id', orgId)
        .eq('is_published', true)
        .or('title.ilike.$pattern,content.ilike.$pattern')
        .order('updated_at', ascending: false)
        .limit(20);

    return (response as List).map((json) => WikiPage.fromJson(json)).toList();
  }
}
