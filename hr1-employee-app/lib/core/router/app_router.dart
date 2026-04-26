import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/auth/presentation/screens/splash_screen.dart';
import 'package:hr1_employee_app/features/auth/presentation/screens/login_screen.dart';
import 'package:hr1_employee_app/features/auth/presentation/screens/home_screen.dart';
import 'package:hr1_employee_app/features/auth/presentation/screens/profile_edit_screen.dart';
import 'package:hr1_employee_app/features/feed/presentation/screens/feed_detail_screen.dart';
import 'package:hr1_employee_app/features/feed/presentation/screens/feed_screen.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/portal_screen.dart';
import 'package:hr1_employee_app/features/calendar/presentation/screens/calendar_screen.dart';
import 'package:hr1_employee_app/features/messages/presentation/screens/messages_screen.dart';
import 'package:hr1_employee_app/features/messages/presentation/screens/thread_chat_screen.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_detail_screen.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/tasks_screen.dart';
import 'package:hr1_employee_app/features/auth/presentation/screens/profile_screen.dart';
import 'package:hr1_employee_app/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:hr1_employee_app/features/attendance/presentation/screens/attendance_detail_screen.dart';
import 'package:hr1_employee_app/features/shifts/presentation/screens/shift_request_screen.dart';
import 'package:hr1_employee_app/features/attendance/presentation/screens/correction_request_screen.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/screens/employee_detail_screen.dart';
import 'package:hr1_employee_app/features/employees/presentation/screens/employee_list_screen.dart';
import 'package:hr1_employee_app/features/skills/presentation/screens/certifications_edit_screen.dart';
import 'package:hr1_employee_app/features/skills/presentation/screens/skills_edit_screen.dart';
import 'package:hr1_employee_app/features/faq/presentation/screens/faq_screen.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:hr1_employee_app/features/wiki/presentation/screens/wiki_list_screen.dart';
import 'package:hr1_employee_app/features/wiki/presentation/screens/wiki_detail_screen.dart';
import 'package:hr1_employee_app/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:hr1_employee_app/features/announcements/presentation/screens/announcements_screen.dart';
import 'package:hr1_employee_app/features/service_requests/presentation/screens/service_request_list_screen.dart';
import 'package:hr1_employee_app/features/service_requests/presentation/screens/service_request_create_screen.dart';
import 'package:hr1_employee_app/features/surveys/presentation/screens/survey_list_screen.dart';
import 'package:hr1_employee_app/features/surveys/presentation/screens/survey_answer_screen.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/screens/workflow_list_screen.dart';
import 'package:hr1_employee_app/features/workflow/presentation/screens/workflow_create_screen.dart';
import 'package:hr1_employee_app/features/workflow/presentation/screens/workflow_detail_screen.dart';
import 'package:hr1_employee_app/features/leave/presentation/screens/leave_balance_screen.dart';
import 'package:hr1_employee_app/features/payslips/domain/entities/payslip.dart';
import 'package:hr1_employee_app/features/payslips/presentation/screens/payslip_list_screen.dart';
import 'package:hr1_employee_app/features/payslips/presentation/screens/payslip_detail_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/crm_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/card_scan_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/card_scan_review_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/contacts_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/contact_detail_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/companies_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/company_detail_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/deals_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/deal_detail_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/deal_form_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/activity_form_screen.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/screens/bc_todo_form_screen.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/screens/ai_chat_screen.dart';
import 'package:hr1_employee_app/shared/screens/search_screen.dart';

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
  static const String feed = '/feed';
  static const String tasks = '/tasks';
  static const String profile = '/profile';
  static const String crm = '/crm';

  // サブルートセグメント（相対パス）
  static const String _attendance = 'attendance';
  static const String _correction = 'correction';
  static const String _thread = 'thread';
  static const String _employeeDetail = 'employee-detail';
  static const String _employees = 'employees';
  static const String _search = 'search';
  static const String _profileEdit = 'profile-edit';
  static const String _chat = 'chat';
  static const String _skillsEdit = 'skills-edit';
  static const String _certificationsEdit = 'certifications-edit';
  static const String _profileFullscreen = 'profile-fullscreen';
  static const String _serviceRequests = 'service-requests';
  static const String _serviceRequestCreate = 'service-request-create';
  static const String _faq = 'faq';
  static const String _surveys = 'surveys';
  static const String _notifications = 'notifications';
  static const String _announcements = 'announcements';
  static const String _workflow = 'workflow';
  static const String _workflowCreate = 'workflow-create';
  static const String _workflowDetail = 'workflow-detail';
  static const String _leaveBalance = 'leave-balance';
  static const String _payslips = 'payslips';
  static const String _payslipDetail = 'payslip-detail';
  static const String _wiki = 'wiki';
  static const String _wikiDetail = 'wiki-detail';
  static const String _bcScan = 'bc-scan';
  static const String _bcScanReview = 'bc-scan-review';
  static const String _bcContacts = 'bc-contacts';
  static const String _bcContactDetail = 'bc-contact-detail';
  static const String _bcCompanies = 'bc-companies';
  static const String _bcCompanyDetail = 'bc-company-detail';
  static const String _bcDeals = 'bc-deals';
  static const String _bcDealDetail = 'bc-deal-detail';
  static const String _bcDealForm = 'bc-deal-form';
  static const String _bcActivityForm = 'bc-activity-form';
  static const String _bcTodoForm = 'bc-todo-form';
  static const String _bcContactForm = 'bc-contact-form';

  // AIアシスタント
  static const String _aiChat = 'ai-chat';

  // タスク詳細
  static const String _taskDetail = 'task-detail';
  // フィード詳細
  static const String _feedDetail = 'feed-detail';
  // フルパス（画面遷移用）
  static const String faq = '/$_faq';
  static const String wiki = '/$_wiki';
  static const String wikiDetail = '/$_wikiDetail';
  static const String surveys = '/$_surveys';
  static const String notifications = '/$_notifications';
  static const String announcements = '/$_announcements';
  static const String profileFullscreen = '/$_profileFullscreen';
  static const String attendance = '/$_attendance';
  static const String employees = '/$_employees';
  static const String employeeDetail = '/$_employeeDetail';
  static const String _attendanceDetail = 'detail';
  static const String correction = '/$_attendance/$_correction';
  static const String attendanceDetail = '/$_attendance/$_attendanceDetail';
  static const String _shiftRequest = 'shift-request';
  static const String shiftRequest = '/$_shiftRequest';
  static const String messageThread = '$messages/$_thread';
  static const String search = '/$_search';
  static const String profileEdit = '/$_profileEdit';
  static const String chat = '/$_chat';
  static const String skillsEdit = '/$_skillsEdit';
  static const String certificationsEdit = '/$_certificationsEdit';
  static const String serviceRequests = '/$_serviceRequests';
  static const String serviceRequestCreate = '/$_serviceRequestCreate';
  static const String workflow = '/$_workflow';
  static const String workflowCreate = '/$_workflowCreate';
  static const String workflowDetail = '/$_workflowDetail';
  static const String leaveBalance = '/$_leaveBalance';
  static const String payslips = '/$_payslips';
  static const String payslipDetail = '/$_payslipDetail';

  // CRM（名刺管理）
  static const String bcScan = '/$_bcScan';
  static const String bcScanReview = '/$_bcScanReview';
  static const String bcContacts = '/$_bcContacts';
  static const String bcContactDetail = '/$_bcContactDetail';
  static const String bcCompanies = '/$_bcCompanies';
  static const String bcCompanyDetail = '/$_bcCompanyDetail';
  static const String bcDeals = '/$_bcDeals';
  static const String bcDealDetail = '/$_bcDealDetail';
  static const String bcDealForm = '/$_bcDealForm';
  static const String bcActivityForm = '/$_bcActivityForm';
  static const String bcTodoForm = '/$_bcTodoForm';
  static const String bcContactForm = '/$_bcContactForm';

  static const String taskDetail = '/$_taskDetail';
  static const String feedDetail = '/$_feedDetail';

  // AIアシスタント（フルスクリーン）
  static const String aiChat = '/$_aiChat';
}

/// ルートナビゲーターキー（フルスクリーン遷移用 + プッシュ通知からの遷移用）
final rootNavigatorKey = GlobalKey<NavigatorState>();

/// GoRouter プロバイダー
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: true,

    /// 認証ガード
    redirect: (BuildContext context, GoRouterState state) {
      final isLoggedIn = ref.read(authRepositoryProvider).hasSession;
      final isAuthRoute =
          state.matchedLocation == AppRoutes.splash ||
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
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.attendance,
        builder: (context, state) => const AttendanceScreen(),
        routes: [
          GoRoute(
            parentNavigatorKey: rootNavigatorKey,
            path: AppRoutes._correction,
            builder: (context, state) => const CorrectionRequestScreen(),
          ),
          GoRoute(
            parentNavigatorKey: rootNavigatorKey,
            path: AppRoutes._attendanceDetail,
            builder: (context, state) => const AttendanceDetailScreen(),
          ),
        ],
      ),

      /// シフト希望提出画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.shiftRequest,
        builder: (context, state) => const ShiftRequestScreen(),
      ),

      /// 検索画面（フルスクリーン・フェードトランジション）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.search,
        pageBuilder: (context, state) => CustomTransitionPage(
          key: state.pageKey,
          child: const SearchScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(
              opacity: CurvedAnimation(
                parent: animation,
                curve: Curves.easeOut,
              ),
              child: child,
            );
          },
          transitionDuration: const Duration(milliseconds: 250),
          reverseTransitionDuration: const Duration(milliseconds: 200),
        ),
      ),

      /// 社員名簿画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.employees,
        builder: (context, state) => const EmployeeListScreen(),
      ),

      /// 社員プロフィール詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.employeeDetail,
        builder: (context, state) {
          final contact = state.extra as EmployeeContact?;
          if (contact == null) {
            return const CommonScaffold(
              body: ErrorState(message: '社員情報が見つかりません'),
            );
          }
          return EmployeeDetailScreen(contact: contact);
        },
      ),

      /// チャット画面（フルスクリーン — 社員詳細などから遷移）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.chat,
        builder: (context, state) {
          final thread = state.extra as MessageThread?;
          if (thread == null) {
            return const CommonScaffold(
              body: ErrorState(message: 'スレッド情報が見つかりません'),
            );
          }
          return ThreadChatScreen(thread: thread);
        },
      ),

      /// メッセージ一覧（フルスクリーン — タブ廃止後はヘッダーのチャット
      /// アイコンから push される）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
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

      /// スキル編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.skillsEdit,
        builder: (context, state) => const SkillsEditScreen(),
      ),

      /// 資格編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.certificationsEdit,
        builder: (context, state) => const CertificationsEditScreen(),
      ),

      /// プロフィール編集画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.profileEdit,
        builder: (context, state) => const ProfileEditScreen(),
      ),

      /// 通知画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),

      /// お知らせ画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.announcements,
        builder: (context, state) {
          final highlightId = state.extra as String?;
          return AnnouncementsScreen(highlightId: highlightId);
        },
      ),

      /// FAQ画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.faq,
        builder: (context, state) {
          final initialQuery = state.extra as String?;
          return FaqScreen(initialQuery: initialQuery);
        },
      ),

      /// 社内Wiki一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.wiki,
        builder: (context, state) => const WikiListScreen(),
      ),

      /// 社内Wikiページ詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.wikiDetail,
        builder: (context, state) {
          final page = state.extra as WikiPage?;
          if (page == null) {
            return const CommonScaffold(
              body: ErrorState(message: 'ページが見つかりません'),
            );
          }
          return WikiDetailScreen(page: page);
        },
      ),

      /// パルスサーベイ一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.surveys,
        builder: (context, state) => const SurveyListScreen(),
        routes: [
          GoRoute(
            parentNavigatorKey: rootNavigatorKey,
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

      /// サービスリクエスト画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.serviceRequests,
        builder: (context, state) => const ServiceRequestListScreen(),
      ),

      /// サービスリクエスト作成画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.serviceRequestCreate,
        builder: (context, state) {
          final type =
              state.extra as ServiceRequestType? ?? ServiceRequestType.bug;
          return ServiceRequestCreateScreen(type: type);
        },
      ),

      /// ワークフロー申請一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.workflow,
        builder: (context, state) => const WorkflowListScreen(),
      ),

      /// ワークフロー申請作成画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.workflowCreate,
        builder: (context, state) {
          final type =
              state.extra as WorkflowRequestType? ??
              WorkflowRequestType.paidLeave;
          return WorkflowCreateScreen(type: type);
        },
      ),

      /// ワークフロー申請詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.workflowDetail,
        builder: (context, state) {
          final request = state.extra as WorkflowRequest?;
          if (request == null) {
            return const CommonScaffold(
              body: ErrorState(message: '申請情報が見つかりません'),
            );
          }
          return WorkflowDetailScreen(request: request);
        },
      ),

      /// 有給・休暇管理画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.leaveBalance,
        builder: (context, state) => const LeaveBalanceScreen(),
      ),

      /// 給与明細一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.payslips,
        builder: (context, state) => const PayslipListScreen(),
      ),

      /// 給与明細詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.payslipDetail,
        builder: (context, state) {
          final payslip = state.extra as Payslip?;
          if (payslip == null) {
            return const CommonScaffold(
              body: ErrorState(message: '給与明細が見つかりません'),
            );
          }
          return PayslipDetailScreen(payslip: payslip);
        },
      ),

      /// 名刺スキャン画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcScan,
        builder: (context, state) => const CardScanScreen(),
      ),

      /// 名刺撮影後の確認・入力画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcScanReview,
        builder: (context, state) =>
            CardScanReviewScreen(imagePath: state.extra as String?),
      ),

      /// 連絡先手動登録画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcContactForm,
        builder: (context, state) => const CardScanReviewScreen(),
      ),

      /// CRM連絡先一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcContacts,
        builder: (context, state) => const BcContactsScreen(),
      ),

      /// CRM連絡先詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcContactDetail,
        builder: (context, state) {
          final contactId = state.extra as String?;
          if (contactId == null) {
            return const CommonScaffold(
              body: ErrorState(message: '連絡先IDが見つかりません'),
            );
          }
          return BcContactDetailScreen(contactId: contactId);
        },
      ),

      /// CRM企業一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcCompanies,
        builder: (context, state) => const BcCompaniesScreen(),
      ),

      /// CRM企業詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcCompanyDetail,
        builder: (context, state) {
          final companyId = state.extra as String?;
          if (companyId == null) {
            return const CommonScaffold(
              body: ErrorState(message: '企業IDが見つかりません'),
            );
          }
          return BcCompanyDetailScreen(companyId: companyId);
        },
      ),

      /// CRM商談一覧画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcDeals,
        builder: (context, state) => const BcDealsScreen(),
      ),

      /// CRM商談詳細画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcDealDetail,
        builder: (context, state) {
          final dealId = state.extra as String?;
          if (dealId == null) {
            return const CommonScaffold(
              body: ErrorState(message: '商談IDが見つかりません'),
            );
          }
          return BcDealDetailScreen(dealId: dealId);
        },
      ),

      /// CRM商談登録画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcDealForm,
        builder: (context, state) {
          final extra = state.extra as Map<String, String?>?;
          return DealFormScreen(
            companyId: extra?['companyId'],
            contactId: extra?['contactId'],
          );
        },
      ),

      /// CRM活動登録画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcActivityForm,
        builder: (context, state) {
          final extra = state.extra as Map<String, String?>?;
          return ActivityFormScreen(
            companyId: extra?['companyId'],
            contactId: extra?['contactId'],
            dealId: extra?['dealId'],
            initialType: extra?['type'] ?? 'memo',
          );
        },
      ),

      /// CRM TODO登録画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.bcTodoForm,
        builder: (context, state) {
          final extra = state.extra as Map<String, String?>?;
          return BcTodoFormScreen(
            companyId: extra?['companyId'],
            contactId: extra?['contactId'],
            dealId: extra?['dealId'],
          );
        },
      ),

      /// プロフィール画面（フルスクリーン — ヘッダーアイコンから遷移）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.profileFullscreen,
        builder: (context, state) => const ProfileScreen(),
      ),

      /// タスク詳細（フルスクリーン）— extra: String? taskId
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.taskDetail,
        builder: (context, state) =>
            TaskDetailScreen(taskId: state.extra as String?),
      ),

      /// フィード投稿詳細（フルスクリーン）— extra: String? postId
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.feedDetail,
        builder: (context, state) =>
            FeedDetailScreen(postId: state.extra as String?),
      ),

      /// AIアシスタント会話画面（フルスクリーン）
      GoRoute(
        parentNavigatorKey: rootNavigatorKey,
        path: AppRoutes.aiChat,
        builder: (context, state) {
          final initialMessage = state.extra as String?;
          return AiChatScreen(initialMessage: initialMessage);
        },
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
                path: AppRoutes.feed,
                builder: (context, state) => const FeedScreen(),
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
                path: AppRoutes.crm,
                builder: (context, state) => const CrmScreen(),
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
      loading: () => const CommonScaffold(body: LoadingIndicator()),
      error: (_, __) => CommonScaffold(
        appBar: AppBar(),
        body: const ErrorState(message: 'サーベイの読み込みに失敗しました'),
      ),
      data: (survey) {
        if (survey == null) {
          return CommonScaffold(
            appBar: AppBar(),
            body: const ErrorState(message: 'サーベイが見つかりません'),
          );
        }
        return SurveyAnswerScreen(survey: survey);
      },
    );
  }
}
