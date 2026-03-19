import 'form_field_item.dart';

/// カスタムフォーム（Google Forms風）
class CustomForm {
  const CustomForm({
    required this.id,
    required this.title,
    required this.fields,
    this.description,
    this.applicationId,
  });

  final String id;
  final String title;
  final String? description;
  final List<FormFieldItem> fields;

  /// 紐づく応募ID
  final String? applicationId;

  factory CustomForm.fromJson(Map<String, dynamic> json) {
    return CustomForm(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      fields:
          (json['fields'] as List<dynamic>)
              .map((e) => FormFieldItem.fromJson(e as Map<String, dynamic>))
              .toList()
            ..sort((a, b) => a.order.compareTo(b.order)),
      applicationId: json['application_id'] as String?,
    );
  }
}
