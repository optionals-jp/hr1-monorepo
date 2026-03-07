/// フォームフィールドの種類
enum FormFieldType {
  /// テキスト入力（短文）
  shortText,

  /// テキスト入力（長文）
  longText,

  /// 単一選択（ラジオボタン）
  radio,

  /// 複数選択（チェックボックス）
  checkbox,

  /// ドロップダウン
  dropdown,

  /// 日付選択
  date,

  /// ファイルアップロード
  fileUpload,
}

/// フォームの1つのフィールド定義
class FormFieldItem {
  const FormFieldItem({
    required this.id,
    required this.label,
    required this.type,
    this.description,
    this.isRequired = false,
    this.options,
    this.placeholder,
    this.order = 0,
  });

  final String id;
  final String label;
  final FormFieldType type;
  final String? description;
  final bool isRequired;

  /// radio / checkbox / dropdown 用の選択肢
  final List<String>? options;

  final String? placeholder;

  /// 表示順
  final int order;

  factory FormFieldItem.fromJson(Map<String, dynamic> json) {
    return FormFieldItem(
      id: json['id'] as String,
      label: json['label'] as String,
      type: FormFieldType.values.firstWhere(
        (t) => t.name == json['type'],
        orElse: () => FormFieldType.shortText,
      ),
      description: json['description'] as String?,
      isRequired: json['is_required'] as bool? ?? false,
      options: (json['options'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      placeholder: json['placeholder'] as String?,
      order: json['order'] as int? ?? 0,
    );
  }
}
