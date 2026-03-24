import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/faq/domain/entities/faq_item.dart';

/// FAQ のSupabaseリポジトリ
class SupabaseFaqRepository {
  SupabaseFaqRepository(this._client, {this.overrideUserId});

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

  /// 社員向けの公開済みFAQ一覧を取得
  Future<List<FaqItem>> getEmployeeFaqs() async {
    final orgId = await _getOrganizationId();
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
    final orgId = await _getOrganizationId();
    final sanitized = _sanitizeForLike(query);
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

  static String _sanitizeForLike(String input) {
    return input
        .replaceAll(r'\', r'\\')
        .replaceAll('%', r'\%')
        .replaceAll('_', r'\_')
        .replaceAll(',', ' ')
        .replaceAll('(', ' ')
        .replaceAll(')', ' ');
  }
}
