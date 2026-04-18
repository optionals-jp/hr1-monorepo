import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';

class SupabaseWikiRepository {
  SupabaseWikiRepository(
    this._client, {
    required this.activeOrganizationId,
    this.overrideUserId,
  });

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  final String? overrideUserId;

  Future<List<WikiPage>> getPublishedPages() async {
    final orgId = activeOrganizationId;
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
    final orgId = activeOrganizationId;
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
