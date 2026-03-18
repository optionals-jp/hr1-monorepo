import '../../../../shared/domain/entities/page_section.dart';
import 'job_step.dart';

/// 求人情報
class Job {
  const Job({
    required this.id,
    required this.organizationId,
    required this.title,
    required this.description,
    this.department,
    this.location,
    this.employmentType,
    this.salaryRange,
    this.postedAt,
    this.closingAt,
    this.sections = const [],
    this.selectionSteps = const [],
  });

  final String id;
  final String organizationId;
  final String title;
  final String description;
  final String? department;
  final String? location;
  final String? employmentType;
  final String? salaryRange;
  final DateTime? postedAt;
  final DateTime? closingAt;

  /// 求人詳細のカスタマイズ可能なセクション
  final List<PageSection> sections;

  /// 選考フローテンプレート（step_order 昇順）
  final List<JobStep> selectionSteps;

  /// 募集中かどうか
  bool get isOpen => closingAt == null || closingAt!.isAfter(DateTime.now());

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      department: json['department'] as String?,
      location: json['location'] as String?,
      employmentType: json['employment_type'] as String?,
      salaryRange: json['salary_range'] as String?,
      postedAt: json['posted_at'] != null
          ? DateTime.parse(json['posted_at'] as String)
          : null,
      closingAt: json['closing_at'] != null
          ? DateTime.parse(json['closing_at'] as String)
          : null,
      sections:
          (json['sections'] as List<dynamic>?)
              ?.map((e) => PageSection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      selectionSteps: () {
        final raw =
            (json['selection_steps'] as List<dynamic>?)
                ?.map((e) => JobStep.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [];
        raw.sort((a, b) => a.stepOrder.compareTo(b.stepOrder));
        return raw;
      }(),
    );
  }
}
