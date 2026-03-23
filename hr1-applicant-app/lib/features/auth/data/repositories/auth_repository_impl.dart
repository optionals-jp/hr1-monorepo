import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/core/result/result.dart';
import 'package:hr1_applicant_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_applicant_app/features/auth/data/datasources/auth_remote_datasource.dart';

/// AuthRepository の Supabase 実装
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._datasource);

  final AuthRemoteDatasource _datasource;

  @override
  Future<Result<void>> sendOtp({required String email}) async {
    try {
      await _datasource.signInWithOtp(email: email);
      return Result.success(null);
    } on AuthException catch (e) {
      return Result.failure(e.message);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<AppUser>> verifyOtp({
    required String email,
    required String token,
  }) async {
    try {
      await _datasource.verifyOtp(email: email, token: token);
      final user = await _datasource.fetchCurrentUserProfile();
      return Result.success(user);
    } on AuthException catch (e) {
      return Result.failure(e.message);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<void>> signOut() async {
    try {
      await _datasource.signOut();
      return Result.success(null);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<AppUser>> getCurrentUser() async {
    try {
      final user = await _datasource.fetchCurrentUserProfile();
      return Result.success(user);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  Stream<bool> watchAuthState() {
    return _datasource.watchAuthState().map(
      (authState) => authState.session != null,
    );
  }

  @override
  bool get isAuthenticated => _datasource.isAuthenticated;
}
