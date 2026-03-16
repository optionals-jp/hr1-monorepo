import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/home_screen.dart';
import '../../features/portal/presentation/screens/portal_screen.dart';
import '../../features/calendar/presentation/screens/calendar_screen.dart';
import '../../features/messages/presentation/screens/messages_screen.dart';
import '../../features/messages/presentation/screens/thread_chat_screen.dart';
import '../../features/messages/domain/entities/message_thread.dart';
import '../../features/tasks/presentation/screens/tasks_screen.dart';
import '../../features/auth/presentation/screens/profile_screen.dart';
import '../../features/attendance/presentation/screens/attendance_screen.dart';
import '../../features/attendance/presentation/screens/correction_request_screen.dart';

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

  // フルパス（画面遷移用）
  static const String attendance = '/$_attendance';
  static const String correction = '/$_attendance/$_correction';
  static const String messageThread = '$messages/$_thread';
}

/// GoRouter プロバイダー
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
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
        path: AppRoutes.attendance,
        builder: (context, state) => const AttendanceScreen(),
        routes: [
          GoRoute(
            path: AppRoutes._correction,
            builder: (context, state) => const CorrectionRequestScreen(),
          ),
        ],
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
