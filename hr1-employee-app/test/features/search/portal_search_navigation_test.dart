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

  group('ポータル画面の AI プロンプトカード', () {
    testWidgets('AI プロンプトカードをタップすると AI チャット画面に遷移する', (tester) async {
      String? pushedPath;
      Object? pushedExtra;

      final mockRouter = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(path: '/', builder: (context, state) => const PortalScreen()),
          GoRoute(
            path: AppRoutes.aiChat,
            builder: (context, state) {
              pushedPath = AppRoutes.aiChat;
              pushedExtra = state.extra;
              return const Scaffold(body: Text('AIチャット画面'));
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

      // ヒーローのグラデーションが repeat() で動き続けるため pumpAndSettle は使えない。
      // 1 フレーム描画させる程度で十分。
      await tester.pump();

      // AI プロンプトカードを探してタップ
      final promptCard = find.text('申請・検索・依頼を聞いてみる');
      expect(promptCard, findsOneWidget, reason: 'AI プロンプトカードが表示されていること');

      await tester.tap(promptCard);
      await tester.pump();

      expect(
        pushedPath,
        equals(AppRoutes.aiChat),
        reason: 'AI プロンプトカードタップで /ai-chat に遷移すること',
      );
      expect(pushedExtra, isNull, reason: 'カード本体タップでは extra (prefill) は渡らないこと');
    });

    testWidgets('プロンプトチップをタップすると文言を extra として AI チャット画面に渡す', (tester) async {
      Object? pushedExtra;

      final mockRouter = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(path: '/', builder: (context, state) => const PortalScreen()),
          GoRoute(
            path: AppRoutes.aiChat,
            builder: (context, state) {
              pushedExtra = state.extra;
              return const Scaffold(body: Text('AIチャット画面'));
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

      await tester.pump();

      final chip = find.text('今週の残業時間は？');
      expect(chip, findsOneWidget);
      await tester.tap(chip);
      await tester.pump();

      expect(
        pushedExtra,
        equals('今週の残業時間は？'),
        reason: 'チップタップではタップした文言が extra として渡ること（prefill 用）',
      );
    });
  });
}
