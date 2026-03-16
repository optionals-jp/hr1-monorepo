/// 社員資格・認定
class EmployeeCertification {
  const EmployeeCertification({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.name,
    this.acquiredDate,
    this.sortOrder = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String name;
  final DateTime? acquiredDate;
  final int sortOrder;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory EmployeeCertification.fromJson(Map<String, dynamic> json) {
    return EmployeeCertification(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      name: json['name'] as String,
      acquiredDate: json['acquired_date'] != null
          ? DateTime.parse(json['acquired_date'] as String)
          : null,
      sortOrder: json['sort_order'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'acquired_date': acquiredDate?.toIso8601String().split('T').first,
        'sort_order': sortOrder,
      };

  EmployeeCertification copyWith({
    String? name,
    DateTime? acquiredDate,
    int? sortOrder,
  }) {
    return EmployeeCertification(
      id: id,
      userId: userId,
      organizationId: organizationId,
      name: name ?? this.name,
      acquiredDate: acquiredDate ?? this.acquiredDate,
      sortOrder: sortOrder ?? this.sortOrder,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
