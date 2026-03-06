/// フォームバリデーションユーティリティ
class Validators {
  Validators._();

  /// メールアドレスバリデーション
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'メールアドレスを入力してください';
    }
    final emailRegex = RegExp(r'^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return '正しいメールアドレスを入力してください';
    }
    return null;
  }

  /// パスワードバリデーション（8文字以上）
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'パスワードを入力してください';
    }
    if (value.length < 8) {
      return 'パスワードは8文字以上で入力してください';
    }
    return null;
  }

  /// 必須入力バリデーション
  static String? required(String? value, [String fieldName = '']) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldNameを入力してください';
    }
    return null;
  }

  /// 電話番号バリデーション
  static String? phoneNumber(String? value) {
    if (value == null || value.isEmpty) {
      return '電話番号を入力してください';
    }
    final phoneRegex = RegExp(r'^[0-9\-]{10,13}$');
    if (!phoneRegex.hasMatch(value)) {
      return '正しい電話番号を入力してください';
    }
    return null;
  }
}
