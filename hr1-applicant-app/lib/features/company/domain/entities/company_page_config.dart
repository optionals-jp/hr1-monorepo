import '../../../../shared/domain/entities/page_section.dart';

/// 企業ページ全体の構成設定
/// 企業ごとにタブ構成・セクション配置をカスタマイズ可能
class CompanyPageConfig {
  const CompanyPageConfig({required this.organizationId, required this.tabs});

  final String organizationId;

  /// タブ定義（タブ名 → セクションリスト）
  /// 例: { "概要": [...], "働く環境": [...], "採用情報": [...] }
  final List<PageTab> tabs;

  factory CompanyPageConfig.fromJson(Map<String, dynamic> json) {
    return CompanyPageConfig(
      organizationId: json['organization_id'] as String,
      tabs: (json['tabs'] as List<dynamic>)
          .map((e) => PageTab.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// タブ1つ分の定義
class PageTab {
  const PageTab({required this.label, required this.sections});

  final String label;
  final List<PageSection> sections;

  factory PageTab.fromJson(Map<String, dynamic> json) {
    return PageTab(
      label: json['label'] as String,
      sections:
          (json['sections'] as List<dynamic>)
              .map((e) => PageSection.fromJson(e as Map<String, dynamic>))
              .toList()
            ..sort((a, b) => a.order.compareTo(b.order)),
    );
  }
}
