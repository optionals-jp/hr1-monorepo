import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/result/result.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';

/// 認証操作の状態
class AuthState {
  const AuthState({this.isLoading = false, this.error});
  final bool isLoading;
  final String? error;
}

/// 認証コントローラー
///
/// OTP送信・検証・ログアウトのビジネスロジックを管理する。
class AuthController extends AutoDisposeNotifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  /// OTP送信
  Future<bool> sendOtp(String email) async {
    state = const AuthState(isLoading: true);
    final result = await ref.read(authRepositoryProvider).sendOtp(email: email);
    return switch (result) {
      Success() => () {
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }

  /// OTP検証 → ログイン
  Future<bool> verifyOtp(String email, String token) async {
    state = const AuthState(isLoading: true);
    final result = await ref
        .read(authRepositoryProvider)
        .verifyOtp(email: email, token: token);
    return switch (result) {
      Success(data: final user) => () {
        ref.read(appUserProvider.notifier).setUser(user);
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }

  /// セッション復元（スプラッシュ画面用）
  ///
  /// セッションが存在する場合、ユーザー情報を取得して appUserProvider にセットする。
  /// 成功時は true、セッションなし・取得失敗時は false を返す。
  Future<bool> restoreSession() async {
    final repo = ref.read(authRepositoryProvider);
    if (!repo.hasSession) return false;

    final result = await repo.getCurrentUser();
    return switch (result) {
      Success(data: final user) => () {
        ref.read(appUserProvider.notifier).setUser(user);
        return true;
      }(),
      Failure() => false,
    };
  }

  /// ログアウト
  Future<bool> signOut() async {
    state = const AuthState(isLoading: true);
    final result = await ref.read(authRepositoryProvider).signOut();
    return switch (result) {
      Success() => () {
        ref.read(appUserProvider.notifier).clearUser();
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }
}

final authControllerProvider =
    AutoDisposeNotifierProvider<AuthController, AuthState>(AuthController.new);
