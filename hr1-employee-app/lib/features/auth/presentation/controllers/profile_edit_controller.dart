import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/result/result.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';

class ProfileEditController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  Future<bool> updateField(Map<String, dynamic> fields) async {
    final result = await ref
        .read(authRepositoryProvider)
        .updateProfileField(fields);
    switch (result) {
      case Success():
        ref.invalidate(appUserProvider);
        return true;
      case Failure():
        return false;
    }
  }

  Future<bool> uploadAvatar(String filePath) async {
    final result = await ref
        .read(authRepositoryProvider)
        .uploadAvatar(filePath);
    switch (result) {
      case Success():
        ref.invalidate(appUserProvider);
        return true;
      case Failure():
        return false;
    }
  }
}

final profileEditControllerProvider =
    AutoDisposeNotifierProvider<ProfileEditController, void>(
      ProfileEditController.new,
    );
