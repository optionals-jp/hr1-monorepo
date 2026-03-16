import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/home_screen.dart';
import '../../features/auth/presentation/screens/profile_edit_screen.dart';
import '../../features/portal/presentation/screens/portal_screen.dart';
import '../../features/calendar/presentation/screens/calendar_screen.dart';
import '../../features/messages/presentation/screens/messages_screen.dart';
import '../../features/messages/presentation/screens/thread_chat_screen.dart';
import '../../features/messages/domain/entities/message_thread.dart';
import '../../features/tasks/presentation/screens/tasks_screen.dart';
import '../../features/auth/presentation/screens/profile_screen.dart';
import '../../features/attendance/presentation/screens/attendance_screen.dart';
import '../../features/attendance/presentation/screens/correction_request_screen.dart';
import '../../features/employees/domain/entities/employee_contact.dart';
import '../../features/employees/presentation/screens/employee_detail_screen.dart';
import '../../features/skills/presentation/screens/certifications_edit_screen.dart';
import '../../features/skills/presentation/screens/skills_edit_screen.dart';
import '../../shared/screens/search_screen.dart';

/// 開発モードフラグ（trueの場合、認証ガードをスキップ）
const bool kDevMode = false;

/// ルートパス定数
class AppRoutes {
  AppRoutes._();

  // セグメント（GoRouteのpath定義用）
  static const String splash = '/splash';
  static const String login = '/login';
  static const String portal = '/portal';
  static const String calendar = '/calendar';
  static const String messages = '/messages';
  static const String tasks = '/tasks';
  static const String profile = '/profile';

  // サブルートセグメント（相対パス）
  static const String _attendance = 'attendance';
  static const String _correction = 'correction';
  static const String _thread = 'thread';
  static const String _employeeDetail = 'employee-detail';
  static const String _search = 'search';
  static const String _profileEdit = 'profile-edit';
  static const String _chat = 'chat';
  static const String _skillsEdit = 'skills-edit';
  static const String _certificationsEdit = 'certifications-edit';

  // フルパス（画面遷移用）
  static const String attendance = '/$_attendance';
  static const String employeeDetail = '/$_employeeDetail';
  static const String correction = '/$_attendance/$_correction';
  static const String messageThread = '$messages/$_thread';
  static const String search = '/$_search';
  static const String profileEdit = '/$_profileEdit';
  static const String chat = '/$_chat';
  static const String skillsEdit = '/$_skillsEdit';
  static const String certificationsEdit = '/$_certificationsEdit';
}

/// ルートナビゲーターキー（フルスクリーン遷移用）
final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// GoRouter プロバイダー
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,

    /// 認証ガード
    redirect: (BuildContext context, GoRouterState state) {
      final session = Supabase.instance.client.auth.currentSession;
      final isLoggedIn = session != null;
      final isAuthRoute = state.matchedLocation == AppRoutes.splash ||
          state.matchedLocation == AppRoutes.login;

      // 未認証で認証不要ページ以外 → ログインへ
      if (!isLoggedIn && !isAuthRoute) {
        return AppRoutes.login;
      }

      return null;
    },

    routes: [
      /// スプラッシュ画面
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),

      /// ログイン画面
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),

      /// 勤怠打刻画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.attendance,
        builder: (context, state) => const AttendanceScreen(),
        routes: [
          GoRoute(
            parentNavigatorKey: _rootNavigatorKey,
            path: AppRoutes._correction,
            builder: (context, state) => const CorrectionRequestScreen(),
          ),
        ],
      ),

      /// 検索画面（フルスクリーン・フェードトランジション）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.search,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const SearchScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 250),
          reverseTransitionDuration: const Duration(milliseconds: 200),
        ),
      ),

      /// 社員プロフィール詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.employeeDetail,
        builder: (context, state) {
          final contact = state.extra as EmployeeContact?;
          if (contact == null) {
            return const Scaffold(body: Center(child: Text('社員情報が見つかりません')));
          }
          return EmployeeDetailScreen(contact: contact);
        },
      ),

      /// チャット画面（フルスクリーン — 社員詳細などから遷移）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.chat,
        builder: (context, state) {
          final thread = state.extra as MessageThread?;
          if (thread == null) {
            return const Scaffold(body: Center(child: Text('スレッド情報が見つかりません')));
          }
          return ThreadChatScreen(thread: thread);
        },
      ),

      /// スキル編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.skillsEdit,
        builder: (context, state) => const SkillsEditScreen(),
      ),

      /// 資格編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.certificationsEdit,
        builder: (context, state) => const CertificationsEditScreen(),
      ),

      /// プロフィール編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.profileEdit,
        builder: (context, state) => const ProfileEditScreen(),
      ),

      /// メイン画面（ホーム / カレンダー / チャット / タスク / その他）
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return HomeScreen(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.portal,
                builder: (context, state) => const PortalScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.calendar,
                builder: (context, state) => const CalendarScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.messages,
                builder: (context, state) => const MessagesScreen(),
                routes: [
                  GoRoute(
                    path: AppRoutes._thread,
                    builder: (context, state) {
                      final thread = state.extra as MessageThread?;
                      if (thread == null) {
                        return const MessagesScreen();
                      }
                      return ThreadChatScreen(thread: thread);
                    },
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.tasks,
                builder: (context, state) => const TasksScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
