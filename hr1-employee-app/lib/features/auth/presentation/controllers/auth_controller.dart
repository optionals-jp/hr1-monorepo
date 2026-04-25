import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/result/result.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_employee_app/features/calendar/presentation/providers/calendar_providers.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_providers.dart';
import 'package:hr1_employee_app/features/faq/presentation/providers/faq_providers.dart';
import 'package:hr1_employee_app/features/shifts/presentation/controllers/shift_request_controller.dart';
import 'package:hr1_employee_app/features/skills/presentation/providers/skills_providers.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_providers.dart';
import 'package:hr1_employee_app/features/wiki/presentation/providers/wiki_providers.dart';
import 'package:hr1_employee_app/features/workflow/presentation/providers/workflow_providers.dart';

/// 認証操作の状態
class AuthState {
  const AuthState({this.isLoading = false, this.error});
  final bool isLoading;
  final String? error;
}

/// 認証コントローラー
///
/// OTP送信・検証・ログアウトのビジネスロジックを管理する。
class AuthController extends AutoDisposeNotifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  /// OTP送信
  Future<bool> sendOtp(String email) async {
    state = const AuthState(isLoading: true);
    final result = await ref.read(authRepositoryProvider).sendOtp(email: email);
    return switch (result) {
      Success() => () {
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }

  /// OTP検証 → ログイン
  Future<bool> verifyOtp(String email, String token) async {
    state = const AuthState(isLoading: true);
    final result = await ref
        .read(authRepositoryProvider)
        .verifyOtp(email: email, token: token);
    return switch (result) {
      Success(data: final user) => () {
        ref.read(appUserProvider.notifier).setUser(user);
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }

  /// セッション復元（スプラッシュ画面用）
  ///
  /// セッションが存在する場合、ユーザー情報を取得して appUserProvider にセットする。
  /// 成功時は true、セッションなし・取得失敗時は false を返す。
  Future<bool> restoreSession() async {
    final repo = ref.read(authRepositoryProvider);
    if (!repo.hasSession) return false;

    final result = await repo.getCurrentUser();
    return switch (result) {
      Success(data: final user) => () {
        ref.read(appUserProvider.notifier).setUser(user);
        return true;
      }(),
      Failure() => false,
    };
  }

  /// HR-28 follow-up: active 組織を切り替える。
  ///
  /// (1) 指定 orgId が user.organizations に含まれることを検証、
  /// (2) SharedPreferences へ永続化、
  /// (3) AppUser を更新、
  /// (4) 12 個の feature-level provider を invalidate して再フェッチを促す。
  ///
  /// クライアント側検証はあくまで UX 用途。DB 側 RLS が最終的にスコープを
  /// 保証するため、偽造した activeOrganizationId で他組織データは返らない。
  Future<bool> switchActiveOrganization(String organizationId) async {
    final user = ref.read(appUserProvider);
    if (user == null) {
      state = const AuthState(error: 'ユーザーが認証されていません');
      return false;
    }
    if (!user.organizations.any((o) => o.id == organizationId)) {
      state = const AuthState(error: '指定された組織に所属していません');
      return false;
    }
    if (user.activeOrganizationId == organizationId) {
      return true;
    }
    state = const AuthState(isLoading: true);
    final result = await ref
        .read(authRepositoryProvider)
        .persistActiveOrganization(
          userId: user.id,
          organizationId: organizationId,
        );
    return switch (result) {
      Success() => () {
        ref
            .read(appUserProvider.notifier)
            .setUser(user.copyWithActiveOrganization(organizationId));
        // feature-level provider を invalidate（キャッシュ破棄 → 再フェッチ）
        ref.invalidate(attendanceRepositoryProvider);
        ref.invalidate(bcRepositoryProvider);
        ref.invalidate(calendarRepositoryProvider);
        ref.invalidate(employeeRepositoryProvider);
        ref.invalidate(faqRepositoryProvider);
        ref.invalidate(skillsRepositoryProvider);
        ref.invalidate(surveyRepositoryProvider);
        ref.invalidate(taskRepositoryProvider);
        ref.invalidate(taskItemRepositoryProvider);
        ref.invalidate(pendingTaskIdsProvider);
        ref.invalidate(wikiRepositoryProvider);
        ref.invalidate(workflowRepositoryProvider);
        ref.invalidate(announcementsRepositoryProvider);
        ref.invalidate(shiftRequestControllerProvider);
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }

  /// ログアウト
  Future<bool> signOut() async {
    state = const AuthState(isLoading: true);
    final result = await ref.read(authRepositoryProvider).signOut();
    return switch (result) {
      Success() => () {
        ref.read(appUserProvider.notifier).clearUser();
        state = const AuthState();
        return true;
      }(),
      Failure(message: final msg) => () {
        state = AuthState(error: msg);
        return false;
      }(),
    };
  }
}

final authControllerProvider =
    AutoDisposeNotifierProvider<AuthController, AuthState>(AuthController.new);
