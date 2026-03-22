import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_providers.dart';

/// 認証コントローラー
class AuthController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// ログアウト
  Future<bool> signOut() async {
    try {
      await ref.read(authRepositoryProvider).signOut();
      ref.read(appUserProvider.notifier).clearUser();
      return true;
    } catch (_) {
      return false;
    }
  }
}

final authControllerProvider =
    AutoDisposeNotifierProvider<AuthController, void>(AuthController.new);
