/// 求人の選考ステップテンプレート
class JobStep {
  const JobStep({
    required this.id,
    required this.jobId,
    required this.stepType,
    required this.stepOrder,
    required this.label,
  });

  final String id;
  final String jobId;
  final String stepType;
  final int stepOrder;
  final String label;

  factory JobStep.fromJson(Map<String, dynamic> json) {
    return JobStep(
      id: json['id'] as String,
      jobId: json['job_id'] as String,
      stepType: json['step_type'] as String,
      stepOrder: json['step_order'] as int,
      label: json['label'] as String,
    );
  }
}
