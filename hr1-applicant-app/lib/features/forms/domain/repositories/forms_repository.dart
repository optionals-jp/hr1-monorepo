import '../entities/custom_form.dart';

/// フォームリポジトリの抽象インターフェース
abstract class FormsRepository {
  /// フォームIDからフォーム情報を取得
  Future<CustomForm?> getForm(String formId);

  /// フォーム回答を送信
  Future<void> submitResponses({
    required String formId,
    required String applicantId,
    required Map<String, dynamic> answers,
  });
}
