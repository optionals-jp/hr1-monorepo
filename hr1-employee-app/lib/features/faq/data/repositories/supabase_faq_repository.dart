import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/faq_item.dart';

/// FAQ のSupabaseリポジトリ
class SupabaseFaqRepository {
  SupabaseFaqRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> _getOrganizationId() async {
    final row = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return row['organization_id'] as String;
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
}
