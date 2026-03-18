/// セクションの種類
enum SectionType {
  /// マークダウン自由記述
  markdown,

  /// 求人一覧（自動表示）
  jobList,

  /// 福利厚生リスト
  benefitList,

  /// カルチャー・バリューリスト
  valueList,

  /// 数値ハイライト（KPI等）
  stats,

  /// メンバー紹介
  members,

  /// 画像ギャラリー
  gallery,

  /// Q&A / FAQ
  faq,
}

/// 企業ページの1セクション
/// 各企業が自由に並べ替え・追加・編集できる
class PageSection {
  const PageSection({
    required this.id,
    required this.type,
    required this.title,
    this.content,
    this.items = const [],
    this.order = 0,
  });

  final String id;
  final SectionType type;

  /// セクション見出し（空にすると非表示）
  final String title;

  /// マークダウン本文（type == markdown の場合に使用）
  final String? content;

  /// リスト系セクション用の汎用アイテム
  /// - benefitList: 福利厚生テキストのリスト
  /// - valueList: カルチャーテキストのリスト
  /// - stats: { "label": "...", "value": "..." } のリスト
  /// - members: { "name": "...", "role": "...", "avatarUrl": "..." } のリスト
  /// - gallery: { "imageUrl": "...", "caption": "..." } のリスト
  /// - faq: { "question": "...", "answer": "..." } のリスト
  final List<Map<String, dynamic>> items;

  final int order;

  factory PageSection.fromJson(Map<String, dynamic> json) {
    return PageSection(
      id: json['id'] as String,
      type: SectionType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => SectionType.markdown,
      ),
      title: json['title'] as String? ?? '',
      content: json['content'] as String?,
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [],
      order: json['order'] as int? ?? 0,
    );
  }
}
