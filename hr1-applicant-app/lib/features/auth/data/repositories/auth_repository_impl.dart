import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/result/result.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../domain/entities/app_user.dart';
import '../datasources/auth_remote_datasource.dart';

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
    } on Exception catch (e) {
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
    } on Exception catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<void>> signOut() async {
    try {
      await _datasource.signOut();
      return Result.success(null);
    } on Exception catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<AppUser>> getCurrentUser() async {
    try {
      final user = await _datasource.fetchCurrentUserProfile();
      return Result.success(user);
    } on Exception catch (e) {
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
