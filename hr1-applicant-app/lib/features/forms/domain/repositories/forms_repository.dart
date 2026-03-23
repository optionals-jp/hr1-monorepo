import 'dart:io';

import 'package:hr1_applicant_app/features/forms/domain/entities/custom_form.dart';

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

  /// フォーム添付ファイルをアップロードし、公開URLを返す
  Future<String> uploadFormFile({
    required String formId,
    required String fieldId,
    required File file,
    required String extension,
  });
}
