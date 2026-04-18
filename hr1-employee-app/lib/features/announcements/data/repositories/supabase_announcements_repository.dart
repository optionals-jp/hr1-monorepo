import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';

class SupabaseAnnouncementsRepository {
  SupabaseAnnouncementsRepository(
    this._client, {
    required this.activeOrganizationId,
    this.overrideUserId,
  });

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  final String? overrideUserId;

  Future<List<Announcement>> getPublishedAnnouncements() async {
    final orgId = activeOrganizationId;
    final response = await _client
        .from('announcements')
        .select()
        .eq('organization_id', orgId)
        .not('published_at', 'is', null)
        .inFilter('target', ['all', 'employee'])
        .order('is_pinned', ascending: false)
        .order('published_at', ascending: false)
        .limit(100);

    return (response as List)
        .map((json) => Announcement.fromJson(json))
        .toList();
  }

  Future<List<Announcement>> getPinnedAnnouncements() async {
    final orgId = activeOrganizationId;
    final response = await _client
        .from('announcements')
        .select()
        .eq('organization_id', orgId)
        .eq('is_pinned', true)
        .not('published_at', 'is', null)
        .inFilter('target', ['all', 'employee'])
        .order('published_at', ascending: false)
        .limit(5);

    return (response as List)
        .map((json) => Announcement.fromJson(json))
        .toList();
  }

  /// タイトル・本文でお知らせを検索
  Future<List<Announcement>> searchAnnouncements(String query) async {
    final orgId = activeOrganizationId;
    final sanitized = sanitizeForLike(query);
    final pattern = '%$sanitized%';
    final response = await _client
        .from('announcements')
        .select()
        .eq('organization_id', orgId)
        .not('published_at', 'is', null)
        .inFilter('target', ['all', 'employee'])
        .or('title.ilike.$pattern,body.ilike.$pattern')
        .order('published_at', ascending: false)
        .limit(20);

    return (response as List)
        .map((json) => Announcement.fromJson(json))
        .toList();
  }
}
