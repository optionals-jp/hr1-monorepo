class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.isPinned,
    required this.target,
    required this.publishedAt,
    required this.createdBy,
  });

  final String id;
  final String title;
  final String body;
  final bool isPinned;
  final String target;
  final DateTime publishedAt;
  final String createdBy;

  factory Announcement.fromJson(Map<String, dynamic> json) {
    return Announcement(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      isPinned: json['is_pinned'] as bool? ?? false,
      target: json['target'] as String? ?? 'all',
      publishedAt: DateTime.parse(json['published_at'] as String),
      createdBy: json['created_by'] as String,
    );
  }
}
