import 'application_status.dart';
import 'application_step.dart';
import 'job.dart';

/// 応募情報
class Application {
  const Application({
    required this.id,
    required this.jobId,
    required this.applicantId,
    required this.organizationId,
    required this.status,
    required this.appliedAt,
    this.job,
    this.steps = const [],
    this.updatedAt,
  });

  final String id;
  final String jobId;
  final String applicantId;
  final String organizationId;
  final ApplicationStatus status;
  final DateTime appliedAt;
  final Job? job;

  /// 選考ステップ一覧（step_order 昇順）
  final List<ApplicationStep> steps;

  final DateTime? updatedAt;

  /// 現在進行中のステップ
  ApplicationStep? get currentStep =>
      steps.where((s) => s.status == StepStatus.inProgress).firstOrNull;

  /// 応募者側のアクションが必要なステップがあるか
  bool get requiresAction => steps.any((s) => s.requiresAction);

  /// 現在のステップのラベル（一覧画面用）
  String get currentStepLabel {
    final current = currentStep;
    if (current != null) return current.label;
    if (status == ApplicationStatus.offered) return status.label;
    if (status == ApplicationStatus.rejected) return status.label;
    if (status == ApplicationStatus.withdrawn) return status.label;
    return '選考中';
  }

  factory Application.fromJson(Map<String, dynamic> json) {
    return Application(
      id: json['id'] as String,
      jobId: json['job_id'] as String,
      applicantId: json['applicant_id'] as String,
      organizationId: json['organization_id'] as String,
      status: ApplicationStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => ApplicationStatus.active,
      ),
      appliedAt: DateTime.parse(json['applied_at'] as String),
      job: json['job'] != null
          ? Job.fromJson(json['job'] as Map<String, dynamic>)
          : null,
      steps: () {
        final rawSteps = (json['steps'] as List<dynamic>?)
            ?.map((e) =>
                ApplicationStep.fromJson(e as Map<String, dynamic>))
            .toList() ?? [];
        rawSteps.sort((a, b) => a.stepOrder.compareTo(b.stepOrder));
        return rawSteps;
      }(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }
}
