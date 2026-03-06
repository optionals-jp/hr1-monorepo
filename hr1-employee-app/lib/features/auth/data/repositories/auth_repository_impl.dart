import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/result/result.dart';
import '../../domain/entities/app_user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';

/// AuthRepository の Supabase 実装
class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl(this._datasource);

  final AuthRemoteDatasource _datasource;

  @override
  Future<Result<AppUser>> signInWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      await _datasource.signInWithPassword(
        email: email,
        password: password,
      );
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
}
