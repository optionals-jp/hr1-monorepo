import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:hr1_employee_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_employee_app/features/auth/domain/repositories/auth_repository.dart';

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
    FirebaseCrashlytics.instance.setUserIdentifier(user.id);
  }

  /// ユーザー情報をクリア（ログアウト時に呼び出す）
  void clearUser() {
    state = null;
    FirebaseCrashlytics.instance.setUserIdentifier('');
  }
}

/// 認証状態を監視するプロバイダー
final authStateProvider = StreamProvider<bool>((ref) {
  return ref.watch(authRepositoryProvider).watchAuthState();
});
