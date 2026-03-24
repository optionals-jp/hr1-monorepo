class ComplianceAlert {
  const ComplianceAlert({
    required this.id,
    required this.organizationId,
    this.userId,
    required this.alertType,
    required this.severity,
    required this.title,
    required this.description,
    this.metadata,
    required this.isResolved,
    this.resolvedAt,
    required this.createdAt,
  });

  final String id;
  final String organizationId;
  final String? userId;
  final String alertType;
  final String severity;
  final String title;
  final String description;
  final Map<String, dynamic>? metadata;
  final bool isResolved;
  final DateTime? resolvedAt;
  final DateTime createdAt;

  factory ComplianceAlert.fromJson(Map<String, dynamic> json) {
    return ComplianceAlert(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      userId: json['user_id'] as String?,
      alertType: json['alert_type'] as String,
      severity: json['severity'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      metadata: json['metadata'] as Map<String, dynamic>?,
      isResolved: json['is_resolved'] as bool? ?? false,
      resolvedAt: json['resolved_at'] != null
          ? DateTime.parse(json['resolved_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
