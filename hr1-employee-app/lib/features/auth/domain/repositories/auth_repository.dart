import '../../../../core/result/result.dart';
import '../entities/app_user.dart';

/// 認証リポジトリの抽象インターフェース
/// domain層はこのインターフェースにのみ依存する
abstract class AuthRepository {
  /// メールアドレスにOTPを送信
  Future<Result<void>> sendOtp({required String email});

  /// OTPを検証してログイン
  Future<Result<AppUser>> verifyOtp({
    required String email,
    required String token,
  });

  /// ログアウト
  Future<Result<void>> signOut();

  /// 現在のユーザー情報を取得
  Future<Result<AppUser>> getCurrentUser();

  /// プロフィールのフィールドを更新
  Future<Result<void>> updateProfileField(Map<String, dynamic> fields);

  /// アバター画像をアップロードしてプロフィールに反映
  Future<Result<String>> uploadAvatar(String filePath);

  /// 認証状態の変更を監視
  Stream<bool> watchAuthState();
}
