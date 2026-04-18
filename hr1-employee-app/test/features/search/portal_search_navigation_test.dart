import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:hr1_employee_app/features/portal/presentation/screens/portal_screen.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/app_user.dart';
import 'package:hr1_employee_app/features/auth/domain/entities/organization_ref.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:hr1_employee_app/features/compliance/presentation/providers/compliance_providers.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_providers.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';

import '../../helpers/firebase_mock.dart';

void main() {
  setUpAll(() async {
    setupFirebaseMocks();
    await Firebase.initializeApp();
  });

  group('ポータル画面の検索ボックス', () {
    testWidgets('検索ボックスをタップすると検索画面に遷移する', (tester) async {
      String? pushedPath;

      final mockRouter = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(path: '/', builder: (context, state) => const PortalScreen()),
          GoRoute(
            path: AppRoutes.search,
            builder: (context, state) {
              pushedPath = AppRoutes.search;
              return const Scaffold(body: Text('検索画面'));
            },
          ),
        ],
      );

      final testUser = AppUser(
        id: 'test-user',
        email: 'test@example.com',
        organizations: const [OrganizationRef(id: 'org-1', name: 'テスト企業')],
        activeOrganizationId: 'org-1',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            appUserProvider.overrideWith((_) {
              final notifier = AppUserNotifier();
              notifier.setUser(testUser);
              return notifier;
            }),
            pinnedAnnouncementsProvider.overrideWith((ref) => Future.value([])),
            unreadNotificationCountProvider.overrideWith((ref) => 0),
            myComplianceAlertsProvider.overrideWith((ref) => Future.value([])),
            latestNotificationsProvider.overrideWith((ref) => Future.value([])),
            todayRecordProvider.overrideWith((ref) => Future.value(null)),
            todayPunchesProvider.overrideWith((ref) => Future.value([])),
            myDayTasksProvider.overrideWith((ref) => Future.value([])),
            pendingSurveysProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp.router(routerConfig: mockRouter),
        ),
      );

      await tester.pumpAndSettle();

      // SearchBox を探してタップ
      final searchBox = find.text('検索');
      expect(searchBox, findsOneWidget, reason: '検索ボックスが表示されていること');

      await tester.tap(searchBox);
      await tester.pumpAndSettle();

      expect(
        pushedPath,
        equals(AppRoutes.search),
        reason: '検索ボックスタップで /search に遷移すること',
      );
    });
  });
}
