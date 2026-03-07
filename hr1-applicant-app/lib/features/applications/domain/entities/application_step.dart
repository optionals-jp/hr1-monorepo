/// 選考ステップの種類
enum StepType {
  screening('screening'),
  form('form'),
  interview('interview'),
  externalTest('external_test'),
  offer('offer');

  const StepType(this.value);
  final String value;

  static StepType fromString(String value) {
    return StepType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => StepType.screening,
    );
  }
}

/// 選考ステップのステータス
enum StepStatus {
  pending('pending'),
  inProgress('in_progress'),
  completed('completed'),
  skipped('skipped');

  const StepStatus(this.value);
  final String value;

  static StepStatus fromString(String value) {
    return StepStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => StepStatus.pending,
    );
  }
}

/// 選考ステップ
class ApplicationStep {
  const ApplicationStep({
    required this.id,
    required this.applicationId,
    required this.stepType,
    required this.stepOrder,
    required this.status,
    required this.label,
    this.relatedId,
    this.startedAt,
    this.completedAt,
  });

  final String id;
  final String applicationId;
  final StepType stepType;
  final int stepOrder;
  final StepStatus status;
  final String label;
  final String? relatedId;
  final DateTime? startedAt;
  final DateTime? completedAt;

  /// 応募者側のアクションが必要か
  bool get requiresAction =>
      status == StepStatus.inProgress &&
      (stepType == StepType.form || stepType == StepType.interview);

  factory ApplicationStep.fromJson(Map<String, dynamic> json) {
    return ApplicationStep(
      id: json['id'] as String,
      applicationId: json['application_id'] as String,
      stepType: StepType.fromString(json['step_type'] as String),
      stepOrder: json['step_order'] as int,
      status: StepStatus.fromString(json['status'] as String),
      label: json['label'] as String,
      relatedId: json['related_id'] as String?,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
    );
  }
}
