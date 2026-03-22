import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

/// プロフィール編集コントローラー
class ProfileEditController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// アバター画像をアップロード
  Future<bool> uploadAvatar(File file, String extension) async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(profileRepositoryProvider);
      final publicUrl = await repo.uploadAvatar(file, extension);

      // appUserProvider を更新
      final currentUser = ref.read(appUserProvider);
      if (currentUser != null) {
        ref
            .read(appUserProvider.notifier)
            .setUser(
              AppUser(
                id: currentUser.id,
                email: currentUser.email,
                role: currentUser.role,
                organizations: currentUser.organizations,
                displayName: currentUser.displayName,
                avatarUrl: publicUrl,
              ),
            );
      }

      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }

  /// 表示名を更新
  Future<bool> updateDisplayName(String name) async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(profileRepositoryProvider);
      await repo.updateProfile(displayName: name);

      // appUserProvider を更新
      final currentUser = ref.read(appUserProvider);
      if (currentUser != null) {
        ref
            .read(appUserProvider.notifier)
            .setUser(
              AppUser(
                id: currentUser.id,
                email: currentUser.email,
                role: currentUser.role,
                organizations: currentUser.organizations,
                displayName: name,
                avatarUrl: currentUser.avatarUrl,
              ),
            );
      }

      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }
}

/// プロフィール編集コントローラープロバイダー
final profileEditControllerProvider =
    AutoDisposeNotifierProvider<ProfileEditController, AsyncValue<void>>(
      ProfileEditController.new,
    );
