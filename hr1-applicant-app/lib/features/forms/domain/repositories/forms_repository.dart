import '../entities/custom_form.dart';

/// フォームリポジトリの抽象インターフェース
abstract class FormsRepository {
  /// フォームIDからフォーム情報を取得
  CustomForm? getForm(String formId);
}
