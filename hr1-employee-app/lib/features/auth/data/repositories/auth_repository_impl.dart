import 'dart:io';

import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/core/result/result.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_employee_app/features/auth/domain/repositories/auth_repository.dart';
import 'package:hr1_employee_app/features/auth/data/datasources/auth_remote_datasource.dart';

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
  Future<Result<void>> updateProfileField(Map<String, dynamic> fields) async {
    try {
      final userId = _datasource.currentUserId;
      if (userId == null) {
        return Result.failure('ユーザーが認証されていません');
      }
      await _datasource.updateProfileField(userId: userId, fields: fields);
      return Result.success(null);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<String>> uploadAvatar(String filePath) async {
    try {
      final userId = _datasource.currentUserId;
      if (userId == null) {
        return Result.failure('ユーザーが認証されていません');
      }
      final ext = filePath.split('.').last;
      final file = File(filePath);
      final publicUrl = await _datasource.uploadAvatar(
        userId: userId,
        file: file,
        extension: ext,
      );
      await _datasource.updateProfileField(
        userId: userId,
        fields: {'avatar_url': publicUrl},
      );
      return Result.success(publicUrl);
    } on Exception catch (e, stackTrace) {
      FirebaseCrashlytics.instance.recordError(e, stackTrace);
      return Result.failure(e.toString());
    }
  }

  @override
  bool get hasSession => _datasource.hasSession;

  @override
  Stream<bool> watchAuthState() {
    return _datasource.watchAuthState().map(
      (authState) => authState.session != null,
    );
  }
}
