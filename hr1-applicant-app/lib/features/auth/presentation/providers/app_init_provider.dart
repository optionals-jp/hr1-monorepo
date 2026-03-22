import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/core/result/result.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

/// アプリ初期化結果
sealed class AppInitResult {}

class AppInitUnauthenticated extends AppInitResult {}

class AppInitAuthenticated extends AppInitResult {
  AppInitAuthenticated(this.user);
  final AppUser user;
}

class AppInitEmployee extends AppInitResult {}

/// アプリ初期化プロバイダー
///
/// 認証状態を確認し、ユーザー情報を読み込む。
final appInitProvider = FutureProvider.autoDispose<AppInitResult>((ref) async {
  final authRepo = ref.read(authRepositoryProvider);

  if (!authRepo.isAuthenticated) {
    return AppInitUnauthenticated();
  }

  final result = await authRepo.getCurrentUser();
  switch (result) {
    case Success(data: final user):
      ref.read(appUserProvider.notifier).setUser(user);
      if (user.isEmployee) {
        return AppInitEmployee();
      }
      return AppInitAuthenticated(user);
    case Failure():
      return AppInitUnauthenticated();
  }
});
