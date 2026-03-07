import 'application_status.dart';
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
    this.pendingFormId,
    this.interviewId,
    this.updatedAt,
  });

  final String id;
  final String jobId;
  final String applicantId;
  final String organizationId;
  final ApplicationStatus status;
  final DateTime appliedAt;
  final Job? job;

  /// 回答待ちのフォームID
  final String? pendingFormId;

  /// 関連する面接ID
  final String? interviewId;

  final DateTime? updatedAt;

  factory Application.fromJson(Map<String, dynamic> json) {
    return Application(
      id: json['id'] as String,
      jobId: json['job_id'] as String,
      applicantId: json['applicant_id'] as String,
      organizationId: json['organization_id'] as String,
      status: ApplicationStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => ApplicationStatus.screening,
      ),
      appliedAt: DateTime.parse(json['applied_at'] as String),
      job: json['job'] != null
          ? Job.fromJson(json['job'] as Map<String, dynamic>)
          : null,
      pendingFormId: json['pending_form_id'] as String?,
      interviewId: json['interview_id'] as String?,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }
}
