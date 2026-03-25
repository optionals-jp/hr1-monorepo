/// 活動種別
enum ActivityType {
  appointment('アポイント'),
  memo('メモ'),
  call('電話'),
  email('メール'),
  visit('訪問');

  const ActivityType(this.label);
  final String label;

  static ActivityType fromString(String value) {
    return ActivityType.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ActivityType.memo,
    );
  }
}

/// 活動記録
class BcActivity {
  const BcActivity({
    required this.id,
    required this.organizationId,
    this.companyId,
    this.contactId,
    this.dealId,
    required this.activityType,
    required this.title,
    this.description,
    this.activityDate,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String? companyId;
  final String? contactId;
  final String? dealId;
  final ActivityType activityType;
  final String title;
  final String? description;
  final DateTime? activityDate;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory BcActivity.fromJson(Map<String, dynamic> json) {
    return BcActivity(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      companyId: json['company_id'] as String?,
      contactId: json['contact_id'] as String?,
      dealId: json['deal_id'] as String?,
      activityType:
          ActivityType.fromString(json['activity_type'] as String? ?? 'memo'),
      title: json['title'] as String,
      description: json['description'] as String?,
      activityDate: json['activity_date'] != null
          ? DateTime.parse(json['activity_date'] as String)
          : null,
      createdBy: json['created_by'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'activity_type': activityType.name,
      'title': title,
      'description': description,
      'activity_date': activityDate?.toIso8601String(),
      'company_id': companyId,
      'contact_id': contactId,
      'deal_id': dealId,
    };
  }

  BcActivity copyWith({
    String? id,
    String? organizationId,
    String? companyId,
    String? contactId,
    String? dealId,
    ActivityType? activityType,
    String? title,
    String? description,
    DateTime? activityDate,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BcActivity(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      companyId: companyId ?? this.companyId,
      contactId: contactId ?? this.contactId,
      dealId: dealId ?? this.dealId,
      activityType: activityType ?? this.activityType,
      title: title ?? this.title,
      description: description ?? this.description,
      activityDate: activityDate ?? this.activityDate,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
