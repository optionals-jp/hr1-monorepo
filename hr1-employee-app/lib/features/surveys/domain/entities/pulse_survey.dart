/// パルスサーベイモデル
class PulseSurvey {
  PulseSurvey({
    required this.id,
    required this.organizationId,
    required this.title,
    this.description,
    required this.target,
    required this.status,
    this.deadline,
    required this.createdAt,
    this.questions = const [],
  });

  final String id;
  final String organizationId;
  final String title;
  final String? description;
  final String target;
  final String status;
  final DateTime? deadline;
  final DateTime createdAt;
  final List<PulseSurveyQuestion> questions;

  factory PulseSurvey.fromJson(Map<String, dynamic> json) {
    final questionsJson = json['pulse_survey_questions'] as List?;
    return PulseSurvey(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      target: json['target'] as String? ?? 'employee',
      status: json['status'] as String? ?? 'draft',
      deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      questions: questionsJson?.map((q) => PulseSurveyQuestion.fromJson(q)).toList() ?? [],
    );
  }
}

/// パルスサーベイ質問モデル
class PulseSurveyQuestion {
  const PulseSurveyQuestion({
    required this.id,
    required this.surveyId,
    required this.type,
    required this.label,
    this.description,
    required this.isRequired,
    this.options,
    required this.sortOrder,
  });

  final String id;
  final String surveyId;
  final String type; // rating, text, single_choice, multiple_choice
  final String label;
  final String? description;
  final bool isRequired;
  final List<String>? options;
  final int sortOrder;

  factory PulseSurveyQuestion.fromJson(Map<String, dynamic> json) {
    final optionsRaw = json['options'];
    List<String>? options;
    if (optionsRaw is List) {
      options = optionsRaw.map((e) => e.toString()).toList();
    }
    return PulseSurveyQuestion(
      id: json['id'] as String,
      surveyId: json['survey_id'] as String,
      type: json['type'] as String,
      label: json['label'] as String,
      description: json['description'] as String?,
      isRequired: json['is_required'] as bool? ?? true,
      options: options,
      sortOrder: json['sort_order'] as int? ?? 0,
    );
  }
}
