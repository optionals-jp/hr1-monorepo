import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/organization.dart';
import 'auth_providers.dart';

/// 現在選択中の企業を管理するプロバイダー
/// 応募者が複数企業にエントリーしている場合、表示対象の企業を切り替える
final currentOrganizationProvider =
    StateNotifierProvider<CurrentOrganizationNotifier, Organization?>((ref) {
  return CurrentOrganizationNotifier(ref);
});

/// 選択中の企業の状態管理
class CurrentOrganizationNotifier extends StateNotifier<Organization?> {
  CurrentOrganizationNotifier(this._ref) : super(null) {
    // 現在のユーザー情報で初期化
    final currentUser = _ref.read(appUserProvider);
    if (currentUser != null && currentUser.organizations.isNotEmpty) {
      state = currentUser.organizations.first;
    }

    // ユーザー情報が変更されたら、デフォルトの企業を自動設定
    _ref.listen(appUserProvider, (previous, next) {
      if (next != null && next.organizations.isNotEmpty) {
        // 現在の選択が無い、または企業リストに含まれない場合はリセット
        if (state == null ||
            !next.organizations.any((org) => org.id == state!.id)) {
          state = next.organizations.first;
        }
      } else {
        state = null;
      }
    });
  }

  final Ref _ref;

  /// 企業を切り替え
  void switchOrganization(Organization organization) {
    state = organization;
  }
}

/// 企業切り替えが可能かどうか（応募者かつ2社以上）
final canSwitchOrganizationProvider = Provider<bool>((ref) {
  final user = ref.watch(appUserProvider);
  if (user == null) return false;
  return user.isApplicant && user.hasMultipleOrganizations;
});
