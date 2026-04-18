import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';

/// 現在アクティブな組織IDを同期的に返す Provider。
///
/// HR-28 follow-up: 単一組織前提の `_getOrganizationId()` をリポジトリごとに
/// 実装する代わりに、AppUser.activeOrganizationId を権威化する。
///
/// 未認証時は StateError を投げる。この場合 UI は `AuthWrapper` により
/// ログイン画面へリダイレクトされるため到達しない想定。
final activeOrganizationIdProvider = Provider<String>((ref) {
  final user = ref.watch(appUserProvider);
  if (user == null) {
    throw StateError('activeOrganizationIdProvider: 未認証ユーザーからの参照');
  }
  return user.activeOrganizationId;
});
