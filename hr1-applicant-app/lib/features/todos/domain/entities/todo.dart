/// TODOソース種別
enum TodoSource {
  manual('manual', '手動'),
  survey('survey', 'サーベイ'),
  form('form', 'フォーム'),
  interview('interview', '面接'),
  system('system', 'システム'),
  offer('offer', '内定');

  const TodoSource(this.value, this.label);
  final String value;
  final String label;

  static TodoSource fromString(String value) {
    return TodoSource.values.firstWhere(
      (e) => e.value == value,
      orElse: () => TodoSource.manual,
    );
  }
}

/// TODOフィルタ種別
enum TodoFilter {
  incomplete('未完了'),
  important('重要'),
  all('すべて');

  const TodoFilter(this.label);
  final String label;
}

/// 応募者TODO
class Todo {
  const Todo({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.title,
    this.note,
    this.isCompleted = false,
    this.completedAt,
    this.isImportant = false,
    this.dueDate,
    this.sortOrder = 0,
    this.source = TodoSource.manual,
    this.sourceId,
    this.actionUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String title;
  final String? note;
  final bool isCompleted;
  final DateTime? completedAt;
  final bool isImportant;
  final DateTime? dueDate;
  final int sortOrder;
  final TodoSource source;
  final String? sourceId;
  final String? actionUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Todo.fromJson(Map<String, dynamic> json) {
    return Todo(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      title: json['title'] as String,
      note: json['note'] as String?,
      isCompleted: json['is_completed'] as bool? ?? false,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      isImportant: json['is_important'] as bool? ?? false,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      sortOrder: json['sort_order'] as int? ?? 0,
      source: TodoSource.fromString(json['source'] as String? ?? 'manual'),
      sourceId: json['source_id'] as String?,
      actionUrl: json['action_url'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'note': note,
      'is_completed': isCompleted,
      'completed_at': completedAt?.toIso8601String(),
      'is_important': isImportant,
      'due_date': dueDate?.toIso8601String().split('T').first,
      'sort_order': sortOrder,
      'source': source.value,
      'source_id': sourceId,
      'action_url': actionUrl,
    };
  }

  Todo copyWith({
    String? id,
    String? userId,
    String? organizationId,
    String? title,
    String? note,
    bool? isCompleted,
    DateTime? completedAt,
    bool? isImportant,
    DateTime? dueDate,
    int? sortOrder,
    TodoSource? source,
    String? sourceId,
    String? actionUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Todo(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      organizationId: organizationId ?? this.organizationId,
      title: title ?? this.title,
      note: note ?? this.note,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      isImportant: isImportant ?? this.isImportant,
      dueDate: dueDate ?? this.dueDate,
      sortOrder: sortOrder ?? this.sortOrder,
      source: source ?? this.source,
      sourceId: sourceId ?? this.sourceId,
      actionUrl: actionUrl ?? this.actionUrl,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// システム生成かどうか
  bool get isSystemGenerated => source != TodoSource.manual;

  /// 期限切れかどうか
  bool get isOverdue {
    if (dueDate == null || isCompleted) return false;
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return dueDate!.isBefore(todayDate);
  }
}
