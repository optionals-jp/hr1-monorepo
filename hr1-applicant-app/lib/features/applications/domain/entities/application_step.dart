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
    this.formId,
    this.interviewId,
    this.startedAt,
    this.completedAt,
    this.applicantActionAt,
  });

  final String id;
  final String applicationId;
  final StepType stepType;
  final int stepOrder;
  final StepStatus status;
  final String label;
  final String? formId;
  final String? interviewId;
  final DateTime? startedAt;
  final DateTime? completedAt;

  /// 応募者がアクション（フォーム送信・面接予約）を完了した日時
  final DateTime? applicantActionAt;

  /// 後方互換: form_id または interview_id を関連リソース ID として返す
  String? get relatedId => formId ?? interviewId;

  /// 応募者側のアクションが必要か
  ///
  /// - form: フォーム送信が必要（送信後 completeStep でステップ完了）
  /// - interview: 面接日程の選択が必要（選択後 applicantActionAt がセットされる）
  /// - リソース ID が未設定の場合はアクション不可（管理者がリソース未リンク）
  /// - applicantActionAt がセット済みの場合はアクション済み
  bool get requiresAction =>
      status == StepStatus.inProgress &&
      relatedId != null &&
      applicantActionAt == null &&
      (stepType == StepType.form || stepType == StepType.interview);

  factory ApplicationStep.fromJson(Map<String, dynamic> json) {
    return ApplicationStep(
      id: json['id'] as String,
      applicationId: json['application_id'] as String,
      stepType: StepType.fromString(json['step_type'] as String),
      stepOrder: json['step_order'] as int,
      status: StepStatus.fromString(json['status'] as String),
      label: json['label'] as String,
      formId: json['form_id'] as String?,
      interviewId: json['interview_id'] as String?,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      applicantActionAt: json['applicant_action_at'] != null
          ? DateTime.parse(json['applicant_action_at'] as String)
          : null,
    );
  }
}
