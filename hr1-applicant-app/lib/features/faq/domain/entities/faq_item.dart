/// FAQ アイテムモデル
class FaqItem {
  const FaqItem({
    required this.id,
    required this.question,
    required this.answer,
    required this.category,
    required this.sortOrder,
  });

  final String id;
  final String question;
  final String answer; // Markdown
  final String category;
  final int sortOrder;

  factory FaqItem.fromJson(Map<String, dynamic> json) {
    return FaqItem(
      id: json['id'] as String,
      question: json['question'] as String,
      answer: json['answer'] as String,
      category: json['category'] as String? ?? 'general',
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }
}

/// FAQ カテゴリラベル
class FaqCategory {
  FaqCategory._();

  static const Map<String, String> labels = {
    'general': '一般',
    'recruitment': '採用',
    'benefits': '福利厚生',
    'work_style': '働き方',
    'culture': '社風・文化',
    'other': 'その他',
  };

  static String label(String category) => labels[category] ?? category;
}
