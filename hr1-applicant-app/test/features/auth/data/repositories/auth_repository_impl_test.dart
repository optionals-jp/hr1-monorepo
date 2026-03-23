import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/core/result/result.dart';
import 'package:hr1_applicant_app/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:hr1_applicant_app/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';

/// テスト用のモックデータソース
class MockAuthRemoteDatasource implements AuthRemoteDatasource {
  Exception? signInException;
  Exception? verifyException;

  @override
  Future<void> signInWithOtp({required String email}) async {
    if (signInException != null) throw signInException!;
  }

  @override
  Future<AuthResponse> verifyOtp({
    required String email,
    required String token,
  }) async {
    if (verifyException != null) throw verifyException!;
    throw UnimplementedError();
  }

  @override
  Future<AppUser> fetchCurrentUserProfile() async {
    throw UnimplementedError();
  }

  @override
  Future<void> signOut() async {}

  @override
  Stream<AuthState> watchAuthState() => const Stream.empty();

  @override
  bool get isAuthenticated => false;
}

void main() {
  late MockAuthRemoteDatasource mockDatasource;
  late AuthRepositoryImpl repository;

  setUp(() {
    mockDatasource = MockAuthRemoteDatasource();
    repository = AuthRepositoryImpl(mockDatasource);
  });

  group('sendOtp', () {
    test('datasourceが例外をスローした場合Failureを返す', () async {
      mockDatasource.signInException = AuthException('Invalid email');

      final result = await repository.sendOtp(email: '');

      expect(result, isA<Failure<void>>());
      expect((result as Failure<void>).message, 'Invalid email');
    });
  });

  group('verifyOtp', () {
    test('datasourceが例外をスローした場合Failureを返す', () async {
      mockDatasource.verifyException = AuthException('Invalid OTP');

      final result = await repository.verifyOtp(
        email: 'test@example.com',
        token: '',
      );

      expect(result, isA<Failure<AppUser>>());
      expect((result as Failure<AppUser>).message, 'Invalid OTP');
    });
  });
}
