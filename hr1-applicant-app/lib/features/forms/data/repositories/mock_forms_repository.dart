import '../../domain/entities/custom_form.dart';
import '../../domain/entities/form_field_item.dart';
import '../../domain/repositories/forms_repository.dart';

/// FormsRepository のモック実装
class MockFormsRepository implements FormsRepository {
  @override
  Future<CustomForm?> getForm(String formId) async {
    return _mockForms.where((f) => f.id == formId).firstOrNull;
  }
}

// --- モックデータ ---

final _mockForms = [
  CustomForm(
    id: 'form-001',
    title: '採用アンケート',
    description: '以下の質問にご回答ください。選考の参考にさせていただきます。',
    applicationId: 'app-001',
    fields: [
      const FormFieldItem(
        id: 'field-001',
        label: '志望動機',
        type: FormFieldType.longText,
        description: '当社を志望された理由をご記入ください',
        isRequired: true,
        order: 1,
      ),
      const FormFieldItem(
        id: 'field-002',
        label: '得意なプログラミング言語',
        type: FormFieldType.checkbox,
        description: '該当するものをすべて選択してください',
        isRequired: true,
        options: [
          'JavaScript/TypeScript',
          'Python',
          'Go',
          'Rust',
          'Java',
          'Dart',
          'その他',
        ],
        order: 2,
      ),
      const FormFieldItem(
        id: 'field-003',
        label: '希望する働き方',
        type: FormFieldType.radio,
        isRequired: true,
        options: ['フルリモート', 'ハイブリッド', 'オフィス出社'],
        order: 3,
      ),
      const FormFieldItem(
        id: 'field-004',
        label: '現在の年収',
        type: FormFieldType.dropdown,
        options: [
          '300万円未満',
          '300万〜500万円',
          '500万〜700万円',
          '700万〜1000万円',
          '1000万円以上',
        ],
        order: 4,
      ),
      const FormFieldItem(
        id: 'field-005',
        label: '入社可能時期',
        type: FormFieldType.date,
        description: '最短の入社可能日を選択してください',
        isRequired: true,
        order: 5,
      ),
      const FormFieldItem(
        id: 'field-006',
        label: '自己PR',
        type: FormFieldType.longText,
        placeholder: '自由にご記入ください（500文字以内）',
        order: 6,
      ),
    ],
  ),
];
