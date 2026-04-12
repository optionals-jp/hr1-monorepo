import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// FAQ のSupabaseリポジトリ（応募者向け）
class SupabaseFaqRepository {
  SupabaseFaqRepository(this._client);

  final SupabaseClient _client;

  /// 応募者向けの公開済みFAQ一覧を取得
  Future<List<FaqItem>> getApplicantFaqs(String organizationId) async {
    final response = await _client
        .from('faqs')
        .select()
        .eq('organization_id', organizationId)
        .eq('is_published', true)
        .inFilter('target', ['applicant', 'both'])
        .order('sort_order', ascending: true)
        .limit(100);

    return (response as List).map((json) => FaqItem.fromJson(json)).toList();
  }
}
