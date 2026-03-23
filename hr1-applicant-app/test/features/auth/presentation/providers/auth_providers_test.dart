import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/user_role.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

import '../../../../helpers/firebase_mock.dart';

void main() {
  late AppUserNotifier notifier;

  setUpAll(() async {
    setupFirebaseMocks();
    await Firebase.initializeApp();
  });

  setUp(() {
    notifier = AppUserNotifier();
  });

  group('AppUserNotifier', () {
    test('初期状態はnull', () {
      expect(notifier.state, isNull);
    });

    test('setUserで状態が更新される', () {
      final user = AppUser(
        id: 'test-id',
        email: 'test@example.com',
        role: UserRole.applicant,
        organizations: [],
      );

      notifier.setUser(user);

      expect(notifier.state, isNotNull);
      expect(notifier.state!.id, 'test-id');
      expect(notifier.state!.email, 'test@example.com');
    });

    test('clearUserで状態がnullにリセットされる', () {
      final user = AppUser(
        id: 'test-id',
        email: 'test@example.com',
        role: UserRole.applicant,
        organizations: [],
      );

      notifier.setUser(user);
      expect(notifier.state, isNotNull);

      notifier.clearUser();
      expect(notifier.state, isNull);
    });
  });
}
