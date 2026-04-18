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
    this.screeningType,
    this.requiresReview = false,
    this.startedAt,
    this.completedAt,
    this.applicantActionAt,
    this.source = 'flow',
    this.isOptional = false,
    this.description,
  });

  final String id;
  final String applicationId;
  final StepType stepType;

  /// 並び順。アドホックステップ挿入のため DB 側は numeric 型。
  /// 表示・並び替え用途のため double で保持する。
  final double stepOrder;
  final StepStatus status;
  final String label;
  final String? formId;
  final String? interviewId;
  final String? screeningType;
  final bool requiresReview;
  final DateTime? startedAt;
  final DateTime? completedAt;

  /// 'flow' = 求人テンプレートから生成、'ad_hoc' = 個別応募に追加されたステップ
  final String source;

  /// 任意ステップ（応募者が任意で対応するもの）
  final bool isOptional;

  /// 候補者向けの依頼内容・追加指示（ad_hoc ステップで特に使用）
  final String? description;

  /// このステップが応募者向けに後から追加されたものか
  bool get isAdHoc => source == 'ad_hoc';

  /// 応募者がアクション（フォーム送信・面接予約）を完了した日時
  final DateTime? applicantActionAt;

  /// 後方互換: form_id または interview_id を関連リソース ID として返す
  String? get relatedId => formId ?? interviewId;

  /// 応募者側のアクションが必要か
  ///
  /// - screening: フォーム紐付きの場合はフォーム回答、書類種類が設定されていればファイル提出
  /// - form: フォーム送信が必要（送信後 completeStep でステップ完了）
  /// - interview: 面接日程の選択が必要（選択後 applicantActionAt がセットされる）
  /// - applicantActionAt がセット済みの場合はアクション済み
  /// 応募者側のアクションが必要か
  bool get requiresAction =>
      status == StepStatus.inProgress &&
      applicantActionAt == null &&
      ((stepType == StepType.screening &&
              (formId != null || screeningType != null)) ||
          ((stepType == StepType.form || stepType == StepType.interview) &&
              relatedId != null));

  /// 担当者の確認待ち（応募者は提出済み、担当者がまだ完了操作していない）
  bool get isUnderReview =>
      status == StepStatus.inProgress &&
      applicantActionAt != null &&
      requiresReview;

  factory ApplicationStep.fromJson(Map<String, dynamic> json) {
    return ApplicationStep(
      id: json['id'] as String,
      applicationId: json['application_id'] as String,
      stepType: StepType.fromString(json['step_type'] as String),
      stepOrder: (json['step_order'] as num).toDouble(),
      status: StepStatus.fromString(json['status'] as String),
      label: json['label'] as String,
      formId: json['form_id'] as String?,
      interviewId: json['interview_id'] as String?,
      screeningType: json['screening_type'] as String?,
      requiresReview: json['requires_review'] as bool? ?? false,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      applicantActionAt: json['applicant_action_at'] != null
          ? DateTime.parse(json['applicant_action_at'] as String)
          : null,
      source: json['source'] as String? ?? 'flow',
      isOptional: json['is_optional'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }
}
