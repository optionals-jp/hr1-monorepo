/// タスク
class Task {
  const Task({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.title,
    this.note,
    this.isCompleted = false,
    this.completedAt,
    this.isImportant = false,
    this.isMyDay = false,
    this.myDayDate,
    this.dueDate,
    this.reminderAt,
    this.listName = 'タスク',
    this.sortOrder = 0,
    required this.createdAt,
    required this.updatedAt,
    this.steps,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String title;
  final String? note;
  final bool isCompleted;
  final DateTime? completedAt;
  final bool isImportant;
  final bool isMyDay;
  final DateTime? myDayDate;
  final DateTime? dueDate;
  final DateTime? reminderAt;
  final String listName;
  final int sortOrder;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<TaskStep>? steps;

  factory Task.fromJson(Map<String, dynamic> json, {List<TaskStep>? steps}) {
    return Task(
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
      isMyDay: json['is_my_day'] as bool? ?? false,
      myDayDate: json['my_day_date'] != null
          ? DateTime.parse(json['my_day_date'] as String)
          : null,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      reminderAt: json['reminder_at'] != null
          ? DateTime.parse(json['reminder_at'] as String)
          : null,
      listName: json['list_name'] as String? ?? 'タスク',
      sortOrder: json['sort_order'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      steps: steps,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'note': note,
      'is_completed': isCompleted,
      'completed_at': completedAt?.toIso8601String(),
      'is_important': isImportant,
      'is_my_day': isMyDay,
      'my_day_date': myDayDate?.toIso8601String().split('T').first,
      'due_date': dueDate?.toIso8601String().split('T').first,
      'reminder_at': reminderAt?.toIso8601String(),
      'list_name': listName,
      'sort_order': sortOrder,
    };
  }

  Task copyWith({
    String? id,
    String? userId,
    String? organizationId,
    String? title,
    String? note,
    bool? isCompleted,
    DateTime? completedAt,
    bool? isImportant,
    bool? isMyDay,
    DateTime? myDayDate,
    DateTime? dueDate,
    DateTime? reminderAt,
    String? listName,
    int? sortOrder,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<TaskStep>? steps,
  }) {
    return Task(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      organizationId: organizationId ?? this.organizationId,
      title: title ?? this.title,
      note: note ?? this.note,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      isImportant: isImportant ?? this.isImportant,
      isMyDay: isMyDay ?? this.isMyDay,
      myDayDate: myDayDate ?? this.myDayDate,
      dueDate: dueDate ?? this.dueDate,
      reminderAt: reminderAt ?? this.reminderAt,
      listName: listName ?? this.listName,
      sortOrder: sortOrder ?? this.sortOrder,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      steps: steps ?? this.steps,
    );
  }

  /// 期限切れかどうか
  bool get isOverdue {
    if (dueDate == null || isCompleted) return false;
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return dueDate!.isBefore(todayDate);
  }

  /// 今日の My Day かどうか
  bool get isActiveMyDay {
    if (!isMyDay || myDayDate == null) return false;
    final today = DateTime.now();
    return myDayDate!.year == today.year &&
        myDayDate!.month == today.month &&
        myDayDate!.day == today.day;
  }
}

/// タスクのサブステップ
class TaskStep {
  const TaskStep({
    required this.id,
    required this.taskId,
    required this.title,
    this.isCompleted = false,
    this.sortOrder = 0,
    required this.createdAt,
  });

  final String id;
  final String taskId;
  final String title;
  final bool isCompleted;
  final int sortOrder;
  final DateTime createdAt;

  factory TaskStep.fromJson(Map<String, dynamic> json) {
    return TaskStep(
      id: json['id'] as String,
      taskId: json['task_id'] as String,
      title: json['title'] as String,
      isCompleted: json['is_completed'] as bool? ?? false,
      sortOrder: json['sort_order'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'task_id': taskId,
      'title': title,
      'is_completed': isCompleted,
      'sort_order': sortOrder,
    };
  }

  TaskStep copyWith({
    String? id,
    String? taskId,
    String? title,
    bool? isCompleted,
    int? sortOrder,
    DateTime? createdAt,
  }) {
    return TaskStep(
      id: id ?? this.id,
      taskId: taskId ?? this.taskId,
      title: title ?? this.title,
      isCompleted: isCompleted ?? this.isCompleted,
      sortOrder: sortOrder ?? this.sortOrder,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// タスクフィルタ種別
enum TaskFilter {
  myDay('My Day'),
  important('重要'),
  planned('計画済み'),
  all('すべて');

  const TaskFilter(this.label);
  final String label;
}
