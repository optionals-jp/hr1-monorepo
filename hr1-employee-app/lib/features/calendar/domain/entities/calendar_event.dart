/// カレンダーイベント
class CalendarEvent {
  const CalendarEvent({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.title,
    this.description,
    required this.startAt,
    required this.endAt,
    this.isAllDay = false,
    this.location,
    this.categoryColor = '#0F6CBD',
    this.recurrenceRule,
    this.reminderMinutes,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String title;
  final String? description;
  final DateTime startAt;
  final DateTime endAt;
  final bool isAllDay;
  final String? location;
  final String categoryColor;
  final String? recurrenceRule;
  final int? reminderMinutes;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      startAt: DateTime.parse(json['start_at'] as String),
      endAt: DateTime.parse(json['end_at'] as String),
      isAllDay: json['is_all_day'] as bool? ?? false,
      location: json['location'] as String?,
      categoryColor: json['category_color'] as String? ?? '#0F6CBD',
      recurrenceRule: json['recurrence_rule'] as String?,
      reminderMinutes: json['reminder_minutes'] as int?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'start_at': startAt.toUtc().toIso8601String(),
      'end_at': endAt.toUtc().toIso8601String(),
      'is_all_day': isAllDay,
      'location': location,
      'category_color': categoryColor,
      'recurrence_rule': recurrenceRule,
      'reminder_minutes': reminderMinutes,
    };
  }

  /// nullable フィールドを明示的に null にクリアする場合は
  /// `clearDescription: true` のように clear フラグを使用する。
  CalendarEvent copyWith({
    String? id,
    String? userId,
    String? organizationId,
    String? title,
    String? description,
    bool clearDescription = false,
    DateTime? startAt,
    DateTime? endAt,
    bool? isAllDay,
    String? location,
    bool clearLocation = false,
    String? categoryColor,
    String? recurrenceRule,
    bool clearRecurrenceRule = false,
    int? reminderMinutes,
    bool clearReminderMinutes = false,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CalendarEvent(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      organizationId: organizationId ?? this.organizationId,
      title: title ?? this.title,
      description: clearDescription ? null : (description ?? this.description),
      startAt: startAt ?? this.startAt,
      endAt: endAt ?? this.endAt,
      isAllDay: isAllDay ?? this.isAllDay,
      location: clearLocation ? null : (location ?? this.location),
      categoryColor: categoryColor ?? this.categoryColor,
      recurrenceRule:
          clearRecurrenceRule ? null : (recurrenceRule ?? this.recurrenceRule),
      reminderMinutes: clearReminderMinutes
          ? null
          : (reminderMinutes ?? this.reminderMinutes),
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// カレンダーカテゴリ色（Outlook準拠）
class CalendarColors {
  CalendarColors._();

  static const List<String> presets = [
    '#0F6CBD', // Blue (default)
    '#5FBE7D', // Green
    '#F07D88', // Red
    '#FF8C00', // Orange
    '#FECB6F', // Yellow
    '#A895E2', // Purple
    '#33BAB1', // Teal
    '#E48BB5', // Pink
    '#A3B367', // Olive
    '#55ABE5', // Light Blue
  ];

  static const Map<String, String> labels = {
    '#0F6CBD': '青',
    '#5FBE7D': '緑',
    '#F07D88': '赤',
    '#FF8C00': 'オレンジ',
    '#FECB6F': '黄',
    '#A895E2': '紫',
    '#33BAB1': 'ティール',
    '#E48BB5': 'ピンク',
    '#A3B367': 'オリーブ',
    '#55ABE5': '水色',
  };
}
