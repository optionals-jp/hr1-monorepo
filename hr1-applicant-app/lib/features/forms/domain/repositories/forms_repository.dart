import '../entities/custom_form.dart';

/// フォームリポジトリの抽象インターフェース
abstract class FormsRepository {
  /// フォームIDからフォーム情報を取得
  Future<CustomForm?> getForm(String formId);
}
