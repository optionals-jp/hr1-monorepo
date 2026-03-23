import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/auth/data/repositories/profile_repository.dart';
import 'package:hr1_applicant_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:hr1_applicant_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/organization.dart';
import 'package:hr1_applicant_app/features/auth/domain/repositories/auth_repository.dart';

/// Supabase クライアントプロバイダー
final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

/// AuthRemoteDatasource プロバイダー
final authRemoteDatasourceProvider = Provider<AuthRemoteDatasource>((ref) {
  return AuthRemoteDatasource(ref.watch(supabaseClientProvider));
});

/// AuthRepository プロバイダー
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(ref.watch(authRemoteDatasourceProvider));
});

/// アプリユーザー情報を管理するプロバイダー
final appUserProvider = StateNotifierProvider<AppUserNotifier, AppUser?>((ref) {
  return AppUserNotifier();
});

/// AppUser の状態管理
class AppUserNotifier extends StateNotifier<AppUser?> {
  AppUserNotifier() : super(null);

  /// ユーザー情報をセット（ログイン後に呼び出す）
  void setUser(AppUser user) {
    state = user;
  }

  /// ユーザー情報をクリア（ログアウト時に呼び出す）
  void clearUser() {
    state = null;
  }
}

/// 現在のユーザーが所属・応募中の企業リスト
final userOrganizationsProvider = Provider<List<Organization>>((ref) {
  final user = ref.watch(appUserProvider);
  return user?.organizations ?? [];
});

/// プロフィールリポジトリプロバイダー
final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(supabaseClientProvider));
});

/// 認証状態を監視するプロバイダー
final authStateProvider = StreamProvider<bool>((ref) {
  return ref.watch(authRepositoryProvider).watchAuthState();
});
