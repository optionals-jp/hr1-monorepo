/// シフト希望モデル
class ShiftRequest {
  const ShiftRequest({
    this.id,
    required this.userId,
    required this.organizationId,
    required this.targetDate,
    this.startTime,
    this.endTime,
    this.isAvailable = true,
    this.note,
    this.submittedAt,
  });

  final String? id;
  final String userId;
  final String organizationId;
  final String targetDate;
  final String? startTime;
  final String? endTime;
  final bool isAvailable;
  final String? note;
  final DateTime? submittedAt;

  bool get isSubmitted => submittedAt != null;

  ShiftRequest copyWith({
    String? startTime,
    String? endTime,
    bool? isAvailable,
    String? note,
  }) {
    return ShiftRequest(
      id: id,
      userId: userId,
      organizationId: organizationId,
      targetDate: targetDate,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      isAvailable: isAvailable ?? this.isAvailable,
      note: note ?? this.note,
      submittedAt: submittedAt,
    );
  }

  factory ShiftRequest.fromJson(Map<String, dynamic> json) {
    return ShiftRequest(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      targetDate: json['target_date'] as String,
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      isAvailable: json['is_available'] as bool? ?? true,
      note: json['note'] as String?,
      submittedAt: json['submitted_at'] != null
          ? DateTime.parse(json['submitted_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'organization_id': organizationId,
      'target_date': targetDate,
      'start_time': startTime,
      'end_time': endTime,
      'is_available': isAvailable,
      'note': note,
    };
  }
}

/// 確定シフトモデル
class ShiftSchedule {
  const ShiftSchedule({
    required this.id,
    required this.userId,
    required this.organizationId,
    required this.targetDate,
    required this.startTime,
    required this.endTime,
    this.positionLabel,
    this.note,
    required this.status,
    this.publishedAt,
  });

  final String id;
  final String userId;
  final String organizationId;
  final String targetDate;
  final String startTime;
  final String endTime;
  final String? positionLabel;
  final String? note;
  final String status;
  final DateTime? publishedAt;

  bool get isPublished => status == 'published';

  factory ShiftSchedule.fromJson(Map<String, dynamic> json) {
    return ShiftSchedule(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      organizationId: json['organization_id'] as String,
      targetDate: json['target_date'] as String,
      startTime: json['start_time'] as String,
      endTime: json['end_time'] as String,
      positionLabel: json['position_label'] as String?,
      note: json['note'] as String?,
      status: json['status'] as String,
      publishedAt: json['published_at'] != null
          ? DateTime.parse(json['published_at'] as String)
          : null,
    );
  }
}
