import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// FAQ のSupabaseリポジトリ
class SupabaseFaqRepository {
  SupabaseFaqRepository(
    this._client, {
    required this.activeOrganizationId,
    this.overrideUserId,
  });

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  final String? overrideUserId;

  /// 社員向けの公開済みFAQ一覧を取得
  Future<List<FaqItem>> getEmployeeFaqs() async {
    final orgId = activeOrganizationId;
    final response = await _client
        .from('faqs')
        .select()
        .eq('organization_id', orgId)
        .eq('is_published', true)
        .inFilter('target', ['employee', 'both'])
        .order('sort_order', ascending: true)
        .limit(100);

    return (response as List).map((json) => FaqItem.fromJson(json)).toList();
  }

  /// 質問・回答でFAQを検索
  Future<List<FaqItem>> searchFaqs(String query) async {
    final orgId = activeOrganizationId;
    final sanitized = sanitizeForLike(query);
    final pattern = '%$sanitized%';
    final response = await _client
        .from('faqs')
        .select()
        .eq('organization_id', orgId)
        .eq('is_published', true)
        .inFilter('target', ['employee', 'both'])
        .or('question.ilike.$pattern,answer.ilike.$pattern')
        .order('sort_order', ascending: true)
        .limit(20);

    return (response as List).map((json) => FaqItem.fromJson(json)).toList();
  }
}
