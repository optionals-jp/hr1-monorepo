import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/widgets/loading_indicator.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/organization_select_screen.dart';
import '../../features/auth/presentation/screens/home_screen.dart';
import '../../features/company/presentation/screens/company_home_screen.dart';
import '../../features/applications/presentation/screens/applications_screen.dart';
import '../../features/applications/presentation/screens/application_detail_screen.dart';
import '../../features/applications/presentation/screens/jobs_screen.dart';
import '../../features/applications/presentation/screens/job_detail_screen.dart';
import '../../features/forms/presentation/screens/form_fill_screen.dart';
import '../../features/interviews/presentation/screens/interview_schedule_screen.dart';
import '../../features/messages/presentation/screens/messages_screen.dart';
import '../../features/messages/presentation/screens/thread_chat_screen.dart';
import '../../features/messages/domain/entities/message_thread.dart';
import '../../features/auth/presentation/screens/profile_screen.dart';
import '../../features/todos/presentation/screens/todos_screen.dart';
import '../../features/todos/presentation/screens/todo_detail_screen.dart';
import '../../features/todos/domain/entities/todo.dart';
import '../../features/faq/presentation/screens/faq_screen.dart';
import '../../features/surveys/presentation/screens/survey_list_screen.dart';
import '../../features/surveys/presentation/screens/survey_answer_screen.dart';
import '../../features/surveys/presentation/providers/survey_providers.dart';
import '../../features/surveys/domain/entities/pulse_survey.dart';

/// ルートパス定数
class AppRoutes {
  AppRoutes._();

  static const String splash = '/splash';
  static const String login = '/login';
  static const String companyHome = '/company';
  static const String applications = '/applications';
  static const String jobs = '/jobs';
  static const String messages = '/messages';
  static const String messageThread = '/messages/:threadId';
  static const String profile = '/profile';
  static const String faq = '/faq';
  static const String surveys = '/surveys';
  static const String todos = '/todos';
  static const String todoDetail = '/todo-detail';
  static const String organizationSelect = '/organization-select';
}

/// 認証不要なルート
const _publicRoutes = [
  AppRoutes.splash,
  AppRoutes.login,
  AppRoutes.organizationSelect,
];

/// ルートナビゲーターキー
final rootNavigatorKey = GlobalKey<NavigatorState>();

/// GoRouter プロバイダー
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,

    /// 認証ガード
    redirect: (BuildContext context, GoRouterState state) {
      final isAuthenticated =
          ref.read(supabaseClientProvider).auth.currentSession != null;
      final currentPath = state.matchedLocation;

      // 公開ルートはそのまま通す
      if (_publicRoutes.contains(currentPath)) return null;

      // 未認証の場合はログインへ
      if (!isAuthenticated) return AppRoutes.login;

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

      /// 企業選択画面（フッターなし）
      GoRoute(
        path: AppRoutes.organizationSelect,
        builder: (context, state) => const OrganizationSelectScreen(),
      ),

      /// やること詳細画面（フルスクリーン）
      GoRoute(
        path: AppRoutes.todoDetail,
        builder: (context, state) {
          final todo = state.extra as Todo;
          return TodoDetailScreen(todo: todo);
        },
      ),

      /// 求人一覧画面
      GoRoute(
        path: AppRoutes.jobs,
        builder: (context, state) => const JobsScreen(),
        routes: [
          GoRoute(
            path: ':jobId',
            builder: (context, state) =>
                JobDetailScreen(jobId: state.pathParameters['jobId']!),
          ),
        ],
      ),

      /// 応募詳細（シェル外 → 独自AppBar、BottomNav非表示）
      GoRoute(
        path: '${AppRoutes.applications}/:applicationId',
        builder: (context, state) => ApplicationDetailScreen(
          applicationId: state.pathParameters['applicationId']!,
        ),
        routes: [
          GoRoute(
            path: 'form/:formId',
            builder: (context, state) => FormFillScreen(
              formId: state.pathParameters['formId']!,
              applicationId: state.pathParameters['applicationId']!,
              stepId: state.extra as String?,
            ),
          ),
          GoRoute(
            path: 'interview/:interviewId',
            builder: (context, state) => InterviewScheduleScreen(
              interviewId: state.pathParameters['interviewId']!,
              applicationId: state.pathParameters['applicationId']!,
              stepId: state.extra as String?,
            ),
          ),
        ],
      ),

      /// FAQ画面（シェル外 → BottomNav非表示）
      GoRoute(
        path: AppRoutes.faq,
        builder: (context, state) => const FaqScreen(),
      ),

      /// パルスサーベイ一覧画面（シェル外 → BottomNav非表示）
      GoRoute(
        path: AppRoutes.surveys,
        builder: (context, state) => const SurveyListScreen(),
        routes: [
          GoRoute(
            path: ':surveyId',
            builder: (context, state) {
              final survey = state.extra as PulseSurvey?;
              if (survey != null) {
                return SurveyAnswerScreen(survey: survey);
              }
              // ディープリンク: extraがない場合はIDから取得
              final surveyId = state.pathParameters['surveyId']!;
              return _SurveyLoaderScreen(surveyId: surveyId);
            },
          ),
        ],
      ),

      /// メッセージ詳細（シェル外 → 独自AppBar、BottomNav非表示）
      GoRoute(
        path: '/messages/:threadId',
        builder: (context, state) {
          final thread = state.extra;
          if (thread is! MessageThread) {
            return const SizedBox.shrink();
          }
          return ThreadChatScreen(thread: thread);
        },
      ),

      /// メイン画面（ホーム / 応募状況 / メッセージ / マイページ）
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return HomeScreen(navigationShell: navigationShell);
        },
        branches: [
          // ホーム（企業プロフィール）
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.companyHome,
                builder: (context, state) => const CompanyHomeScreen(),
              ),
            ],
          ),
          // 応募状況
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.applications,
                builder: (context, state) => const ApplicationsScreen(),
              ),
            ],
          ),
          // メッセージ
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.messages,
                builder: (context, state) => const MessagesScreen(),
              ),
            ],
          ),
          // やること
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.todos,
                builder: (context, state) => const TodosScreen(),
              ),
            ],
          ),
          // マイページ
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

/// ディープリンク用サーベイローダー画面
class _SurveyLoaderScreen extends ConsumerWidget {
  const _SurveyLoaderScreen({required this.surveyId});

  final String surveyId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveyAsync = ref.watch(surveyByIdProvider(surveyId));

    return surveyAsync.when(
      loading: () => const Scaffold(body: LoadingIndicator()),
      error: (_, __) => Scaffold(
        appBar: AppBar(),
        body: const Center(child: Text('サーベイの読み込みに失敗しました')),
      ),
      data: (survey) {
        if (survey == null) {
          return Scaffold(
            appBar: AppBar(),
            body: const Center(child: Text('サーベイが見つかりません')),
          );
        }
        return SurveyAnswerScreen(survey: survey);
      },
    );
  }
}
