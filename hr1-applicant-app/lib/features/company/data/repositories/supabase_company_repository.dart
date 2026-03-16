import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/company_page_config.dart';
import '../../domain/repositories/company_repository.dart';

/// CompanyRepository の Supabase 実装
class SupabaseCompanyRepository implements CompanyRepository {
  SupabaseCompanyRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<CompanyPageConfig?> getPageConfig(String organizationId) async {
    final tabsResponse = await _client
        .from('page_tabs')
        .select('*, page_sections(*)')
        .eq('organization_id', organizationId)
        .order('sort_order', ascending: true);

    final tabs = tabsResponse as List;
    if (tabs.isEmpty) return null;

    // page_tabs → PageTab にマッピング
    final mappedTabs = tabs.map((tab) {
      final tabMap = Map<String, dynamic>.from(tab);
      final rawSections = (tabMap['page_sections'] as List?) ?? [];
      tabMap['sections'] = rawSections.map((s) {
        final sMap = Map<String, dynamic>.from(s);
        sMap['order'] = sMap['sort_order'];
        return sMap;
      }).toList();
      tabMap.remove('page_sections');
      return tabMap;
    }).toList();

    return CompanyPageConfig.fromJson({
      'organization_id': organizationId,
      'tabs': mappedTabs,
    });
  }
}
