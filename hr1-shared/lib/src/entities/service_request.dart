/// サービスリクエストの種別
enum ServiceRequestType {
  bug,
  feature;

  String get label => switch (this) {
    bug => 'バグ報告',
    feature => '機能リクエスト',
  };
}

/// サービスリクエストのステータス
enum ServiceRequestStatus {
  open,
  inProgress,
  resolved,
  closed;

  String get label => switch (this) {
    open => '受付済み',
    inProgress => '対応中',
    resolved => '解決済み',
    closed => 'クローズ',
  };

  static ServiceRequestStatus fromString(String value) => switch (value) {
    'in_progress' => inProgress,
    'resolved' => resolved,
    'closed' => closed,
    _ => open,
  };
}

/// サービスリクエスト エンティティ
class ServiceRequest {
  const ServiceRequest({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.description,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final ServiceRequestType type;
  final String title;
  final String description;
  final ServiceRequestStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory ServiceRequest.fromJson(Map<String, dynamic> json) {
    return ServiceRequest(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      type: json['type'] == 'feature'
          ? ServiceRequestType.feature
          : ServiceRequestType.bug,
      title: json['title'] as String,
      description: json['description'] as String,
      status: ServiceRequestStatus.fromString(json['status'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }
}
