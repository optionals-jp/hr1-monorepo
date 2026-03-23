class WikiPage {
  const WikiPage({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.isPublished,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String content;
  final String? category;
  final bool isPublished;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory WikiPage.fromJson(Map<String, dynamic> json) {
    return WikiPage(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String? ?? '',
      category: json['category'] as String?,
      isPublished: json['is_published'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
