import '../../../../core/result/result.dart';
import '../entities/app_user.dart';

/// 認証リポジトリの抽象インターフェース
/// domain層はこのインターフェースにのみ依存する
abstract class AuthRepository {
  /// メール・パスワードでログイン
  Future<Result<AppUser>> signInWithPassword({
    required String email,
    required String password,
  });

  /// ログアウト
  Future<Result<void>> signOut();

  /// 現在のユーザー情報を取得
  Future<Result<AppUser>> getCurrentUser();

  /// 認証状態の変更を監視
  Stream<bool> watchAuthState();
}
