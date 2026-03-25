/// CRM TODO
class BcTodo {
  const BcTodo({
    required this.id,
    required this.organizationId,
    this.companyId,
    this.contactId,
    this.dealId,
    required this.title,
    this.description,
    this.dueDate,
    this.isCompleted = false,
    this.completedAt,
    required this.assignedTo,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.companyName,
    this.contactName,
    this.dealTitle,
  });

  final String id;
  final String organizationId;
  final String? companyId;
  final String? contactId;
  final String? dealId;
  final String title;
  final String? description;
  final DateTime? dueDate;
  final bool isCompleted;
  final DateTime? completedAt;
  final String assignedTo;
  final String? createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  // 表示用
  final String? companyName;
  final String? contactName;
  final String? dealTitle;

  /// 期限切れかどうか
  bool get isOverdue {
    if (dueDate == null || isCompleted) return false;
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    return dueDate!.isBefore(todayDate);
  }

  factory BcTodo.fromJson(Map<String, dynamic> json) {
    return BcTodo(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      companyId: json['company_id'] as String?,
      contactId: json['contact_id'] as String?,
      dealId: json['deal_id'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      dueDate: json['due_date'] != null
          ? DateTime.parse(json['due_date'] as String)
          : null,
      isCompleted: json['is_completed'] as bool? ?? false,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      assignedTo: json['assigned_to'] as String,
      createdBy: json['created_by'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      companyName: json['bc_companies'] != null
          ? (json['bc_companies'] as Map<String, dynamic>)['name'] as String?
          : null,
      contactName: json['bc_contacts'] != null
          ? _buildContactName(
              json['bc_contacts'] as Map<String, dynamic>)
          : null,
      dealTitle: json['bc_deals'] != null
          ? (json['bc_deals'] as Map<String, dynamic>)['title'] as String?
          : null,
    );
  }

  static String _buildContactName(Map<String, dynamic> contact) {
    final lastName = contact['last_name'] as String? ?? '';
    final firstName = contact['first_name'] as String? ?? '';
    if (firstName.isNotEmpty) return '$lastName $firstName';
    return lastName;
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'due_date': dueDate?.toIso8601String().split('T').first,
      'is_completed': isCompleted,
      'completed_at': completedAt?.toIso8601String(),
      'company_id': companyId,
      'contact_id': contactId,
      'deal_id': dealId,
      'assigned_to': assignedTo,
    };
  }

  BcTodo copyWith({
    String? id,
    String? organizationId,
    String? companyId,
    String? contactId,
    String? dealId,
    String? title,
    String? description,
    DateTime? dueDate,
    bool? isCompleted,
    DateTime? completedAt,
    String? assignedTo,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? companyName,
    String? contactName,
    String? dealTitle,
  }) {
    return BcTodo(
      id: id ?? this.id,
      organizationId: organizationId ?? this.organizationId,
      companyId: companyId ?? this.companyId,
      contactId: contactId ?? this.contactId,
      dealId: dealId ?? this.dealId,
      title: title ?? this.title,
      description: description ?? this.description,
      dueDate: dueDate ?? this.dueDate,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      assignedTo: assignedTo ?? this.assignedTo,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      companyName: companyName ?? this.companyName,
      contactName: contactName ?? this.contactName,
      dealTitle: dealTitle ?? this.dealTitle,
    );
  }
}
