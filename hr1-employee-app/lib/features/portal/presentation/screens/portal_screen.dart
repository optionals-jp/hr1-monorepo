import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/notifications/domain/entities/notification_item.dart';
import 'package:hr1_employee_app/features/notifications/presentation/controllers/notification_controller.dart';
import 'package:hr1_employee_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:hr1_employee_app/features/announcements/domain/entities/announcement.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/action_chip.dart';
import 'package:hr1_employee_app/features/compliance/domain/entities/compliance_alert.dart';
import 'package:hr1_employee_app/features/compliance/presentation/providers/compliance_providers.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:hr1_employee_app/features/attendance/presentation/controllers/attendance_controller.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_employee_app/features/surveys/domain/entities/pulse_survey.dart';
import 'package:hr1_employee_app/features/surveys/presentation/providers/survey_providers.dart';
import 'package:intl/intl.dart';

/// 社内ポータル画面 — Teams / Outlook モバイルスタイル
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            Text(
              user?.organizationName ?? 'HR1',
              style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: Consumer(
              builder: (context, ref, _) {
                final countAsync = ref.watch(unreadNotificationCountProvider);
                final count = countAsync.valueOrNull ?? 0;
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    AppIcons.notification(
                      color: AppColors.textPrimary(context),
                      size: 22,
                    ),
                    if (count > 0)
                      Positioned(
                        right: -6,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          decoration: const BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Center(
                            child: Text(
                              count > 99 ? '99+' : '$count',
                              style: AppTextStyles.caption2.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            onPressed: () => context.push(AppRoutes.notifications),
          ),
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // 検索バー
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
              ),
              child: SearchBox(onTap: () => context.push(AppRoutes.search)),
            ),
          ),

          // 挨拶 + 部署
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.lg,
                AppSpacing.screenHorizontal,
                0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'こんにちは、${user?.displayName ?? 'ゲスト'}さん',
                    style: AppTextStyles.title1,
                  ),
                  if (user?.department != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${user!.department} / ${user.position ?? ''}',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 勤怠ステータスカード
          const SliverToBoxAdapter(child: _AttendanceStatusCard()),

          // 横スクロール アクションチップ
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xl),
              child: SingleChildScrollView(
                clipBehavior: Clip.none,
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                  vertical: 4,
                ),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      PortalActionChip(
                        icon: AppIcons.clock(size: 24, color: AppColors.brand),
                        label: '勤怠打刻',
                        color: AppColors.brand,
                        onTap: () => context.push(AppRoutes.attendance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.doc(size: 24, color: AppColors.warning),
                        label: '各種申請',
                        color: AppColors.warning,
                        onTap: () => context.push(AppRoutes.workflow),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: Icon(
                          Icons.help_outline_rounded,
                          size: 24,
                          color: AppColors.brandLight,
                        ),
                        label: 'FAQ',
                        color: AppColors.brandLight,
                        onTap: () => context.push(AppRoutes.faq),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.menu_book_rounded,
                          size: 24,
                          color: AppColors.brandSecondary,
                        ),
                        label: '社内Wiki',
                        color: AppColors.brandSecondary,
                        onTap: () => context.push(AppRoutes.wiki),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.calendar(
                          size: 24,
                          color: AppColors.success,
                        ),
                        label: '希望シフト',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.shiftRequest),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.poll_outlined,
                          size: 24,
                          color: AppColors.purple,
                        ),
                        label: 'サーベイ',
                        color: AppColors.purple,
                        onTap: () => context.push(AppRoutes.surveys),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.beach_access_rounded,
                          size: 24,
                          color: AppColors.success,
                        ),
                        label: '有給管理',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.leaveBalance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.receipt_long_rounded,
                          size: 24,
                          color: AppColors.brandSecondary,
                        ),
                        label: '給与明細',
                        color: AppColors.brandSecondary,
                        onTap: () => context.push(AppRoutes.payslips),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.user(size: 24, color: AppColors.brand),
                        label: '社員名簿',
                        color: AppColors.brand,
                        onTap: () => context.push(AppRoutes.employees),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.campaign_outlined,
                          size: 24,
                          color: AppColors.warning,
                        ),
                        label: 'お知らせ',
                        color: AppColors.warning,
                        onTap: () => context.push(AppRoutes.announcements),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.camera_alt_rounded,
                          size: 24,
                          color: AppColors.brand,
                        ),
                        label: '名刺スキャン',
                        color: AppColors.brand,
                        onTap: () => context.push(AppRoutes.bcScan),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.contacts_rounded,
                          size: 24,
                          color: AppColors.brandSecondary,
                        ),
                        label: '連絡先',
                        color: AppColors.brandSecondary,
                        onTap: () => context.push(AppRoutes.bcContacts),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.business_rounded,
                          size: 24,
                          color: AppColors.purple,
                        ),
                        label: '取引先',
                        color: AppColors.purple,
                        onTap: () => context.push(AppRoutes.bcCompanies),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.handshake_rounded,
                          size: 24,
                          color: AppColors.success,
                        ),
                        label: '商談',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.bcDeals),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // コンプライアンスアラート
          Consumer(
            builder: (context, ref, _) {
              final alerts =
                  ref.watch(myComplianceAlertsProvider).valueOrNull ?? [];
              if (alerts.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }
              return SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenHorizontal,
                    AppSpacing.xxl,
                    AppSpacing.screenHorizontal,
                    0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: alerts
                        .map((alert) => _ComplianceAlertCard(alert: alert))
                        .toList(),
                  ),
                ),
              );
            },
          ),

          // 今日のタスク
          const _TodayTasksSection(),

          // CRM TODO
          const _CrmTodosSection(),

          // 未回答サーベイ
          const _PendingSurveysSection(),

          // 全社お知らせ
          Consumer(
            builder: (context, ref, _) {
              final pinned =
                  ref.watch(pinnedAnnouncementsProvider).valueOrNull ?? [];
              if (pinned.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }
              return SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionHeader(
                      title: '全社お知らせ',
                      onShowAll: () => context.push(AppRoutes.announcements),
                    ),
                    ...pinned.map(
                      (a) => _PinnedAnnouncementTile(announcement: a),
                    ),
                  ],
                ),
              );
            },
          ),

          // 通知
          SliverToBoxAdapter(
            child: _SectionHeader(
              title: '通知',
              onShowAll: () => context.push(AppRoutes.notifications),
            ),
          ),

          Consumer(
            builder: (context, ref, _) {
              final notificationsAsync = ref.watch(latestNotificationsProvider);
              return notificationsAsync.when(
                loading: () => const SliverToBoxAdapter(
                  child: SizedBox(height: 60, child: LoadingIndicator()),
                ),
                error: (_, __) => SliverToBoxAdapter(
                  child: ErrorState(
                    onRetry: () => ref.invalidate(latestNotificationsProvider),
                  ),
                ),
                data: (notifications) {
                  if (notifications.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.screenHorizontal,
                          vertical: AppSpacing.xl,
                        ),
                        child: Text(
                          '新しい通知はありません',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                      ),
                    );
                  }
                  return SliverList(
                    delegate: SliverChildListDelegate([
                      ...notifications.map(
                        (n) => _NotificationPreviewTile(item: n),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                    ]),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// セクションヘッダー共通
// =============================================================================

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.onShowAll});

  final String title;
  final VoidCallback? onShowAll;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.xxl,
        AppSpacing.screenHorizontal,
        AppSpacing.xs,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary(context),
                fontWeight: FontWeight.w600,
                letterSpacing: 0.3,
              ),
            ),
          ),
          if (onShowAll != null)
            TextButton(
              onPressed: onShowAll,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'すべて表示',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.brand,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// =============================================================================
// 勤怠ステータスカード
// =============================================================================

class _AttendanceStatusCard extends ConsumerWidget {
  const _AttendanceStatusCard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workState = ref.watch(workStateProvider);
    final record = ref.watch(todayRecordProvider).valueOrNull;
    final punchState = ref.watch(attendanceControllerProvider);

    return CommonCard(
      onTap: () => context.push(AppRoutes.attendance),
      margin: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.xl,
        AppSpacing.screenHorizontal,
        0,
      ),
      child: Row(
        children: [
          _workStateIcon(context, workState),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              spacing: AppSpacing.xs,
              children: [
                Text(
                  _workStateLabel(workState),
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  _workStateDescription(workState, record),
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
              ],
            ),
          ),
          _buildActionButton(context, ref, workState, punchState),
        ],
      ),
    );
  }

  Widget _workStateIcon(BuildContext context, WorkState state) {
    switch (state) {
      case WorkState.notStarted:
        return Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.brand.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.login_rounded,
            size: 20,
            color: AppColors.brand,
          ),
        );
      case WorkState.working:
        return Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.work_outline_rounded,
            size: 20,
            color: AppColors.success,
          ),
        );
      case WorkState.onBreak:
        return Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.warning.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.coffee_rounded,
            size: 20,
            color: AppColors.warning,
          ),
        );
      case WorkState.finished:
        return Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.divider(context).withValues(alpha: 0.3),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.check_circle_outline_rounded,
            size: 20,
            color: AppColors.textSecondary(context),
          ),
        );
    }
  }

  String _workStateLabel(WorkState state) {
    switch (state) {
      case WorkState.notStarted:
        return '未出勤';
      case WorkState.working:
        return '勤務中';
      case WorkState.onBreak:
        return '休憩中';
      case WorkState.finished:
        return 'お疲れ様でした';
    }
  }

  String _workStateDescription(WorkState state, AttendanceRecord? record) {
    final now = DateTime.now();
    final weekday = ['月', '火', '水', '木', '金', '土', '日'][now.weekday - 1];
    final dateStr = '${now.month}月${now.day}日（$weekday）';

    switch (state) {
      case WorkState.notStarted:
        return '$dateStr — タップして打刻';
      case WorkState.working:
        if (record?.clockIn != null) {
          final clockInStr = DateFormat(
            'HH:mm',
          ).format(record!.clockIn!.toLocal());
          return '$clockInStr に出勤';
        }
        return dateStr;
      case WorkState.onBreak:
        return '休憩から戻ったらタップ';
      case WorkState.finished:
        if (record != null) {
          return '勤務時間: ${record.workDurationFormatted}';
        }
        return dateStr;
    }
  }

  Widget _buildActionButton(
    BuildContext context,
    WidgetRef ref,
    WorkState state,
    PunchState punchState,
  ) {
    if (state == WorkState.finished) {
      return Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textTertiary(context),
      );
    }

    final (label, action, color) = switch (state) {
      WorkState.notStarted => ('出勤', 'clock_in', AppColors.brand),
      WorkState.working => ('退勤', 'clock_out', AppColors.error),
      WorkState.onBreak => ('休憩終了', 'break_end', AppColors.warning),
      WorkState.finished => ('', '', AppColors.brand),
    };

    return SizedBox(
      height: 36,
      child: FilledButton(
        onPressed: punchState.isLoading
            ? null
            : () =>
                  ref.read(attendanceControllerProvider.notifier).punch(action),
        style: FilledButton.styleFrom(
          backgroundColor: color,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.radius80),
        ),
        child: punchState.isLoading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: AppTextStyles.caption1.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }
}

// =============================================================================
// 今日のタスク
// =============================================================================

class _TodayTasksSection extends ConsumerWidget {
  const _TodayTasksSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(myDayTasksProvider).valueOrNull ?? [];
    final incompleteTasks = tasks.where((t) => !t.isCompleted).toList();

    if (incompleteTasks.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    final displayTasks = incompleteTasks.take(3).toList();

    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: '今日のタスク（${incompleteTasks.length}件）',
            onShowAll: () => context.push(AppRoutes.tasks),
          ),
          ...displayTasks.map((task) => _TaskTile(task: task)),
        ],
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task});

  final Task task;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.tasks),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 12,
        ),
        child: Row(
          children: [
            Icon(
              Icons.radio_button_unchecked_rounded,
              size: 20,
              color: task.isImportant
                  ? AppColors.error
                  : AppColors.textSecondary(context),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (task.dueDate != null)
                    Text(
                      _dueDateLabel(task),
                      style: AppTextStyles.caption2.copyWith(
                        color: task.isOverdue
                            ? AppColors.error
                            : AppColors.textSecondary(context),
                      ),
                    ),
                ],
              ),
            ),
            if (task.isImportant)
              Icon(Icons.star_rounded, size: 18, color: AppColors.warning),
          ],
        ),
      ),
    );
  }

  String _dueDateLabel(Task task) {
    if (task.dueDate == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(
      task.dueDate!.year,
      task.dueDate!.month,
      task.dueDate!.day,
    );

    if (due == today) return '今日まで';
    if (due == today.add(const Duration(days: 1))) return '明日まで';
    if (task.isOverdue) return '期限切れ';
    return '${DateFormat('M/d').format(task.dueDate!)}まで';
  }
}

// =============================================================================
// 未回答サーベイ
// =============================================================================

class _PendingSurveysSection extends ConsumerWidget {
  const _PendingSurveysSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final surveys = ref.watch(pendingSurveysProvider).valueOrNull ?? [];

    if (surveys.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: '未回答サーベイ（${surveys.length}件）',
            onShowAll: () => context.push(AppRoutes.surveys),
          ),
          ...surveys.take(3).map((s) => _SurveyTile(survey: s)),
        ],
      ),
    );
  }
}

class _SurveyTile extends StatelessWidget {
  const _SurveyTile({required this.survey});

  final PulseSurvey survey;

  @override
  Widget build(BuildContext context) {
    final hasDeadline = survey.deadline != null;
    final isUrgent =
        hasDeadline && survey.deadline!.difference(DateTime.now()).inDays <= 3;

    return InkWell(
      onTap: () => context.push(AppRoutes.surveys),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 12,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.purple.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.poll_outlined,
                size: 20,
                color: AppColors.purple,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    survey.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (hasDeadline)
                    Text(
                      '${DateFormat('M/d').format(survey.deadline!)}まで',
                      style: AppTextStyles.caption2.copyWith(
                        color: isUrgent
                            ? AppColors.error
                            : AppColors.textSecondary(context),
                      ),
                    ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary(context),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// 全社お知らせタイル
// =============================================================================

class _PinnedAnnouncementTile extends StatelessWidget {
  const _PinnedAnnouncementTile({required this.announcement});

  final Announcement announcement;

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat(
      'MM/dd',
    ).format(announcement.publishedAt.toLocal());

    return InkWell(
      onTap: () => context.push(AppRoutes.announcements),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 14,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.push_pin,
                size: 20,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    announcement.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dateStr,
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// コンプライアンスアラートカード
// =============================================================================

class _ComplianceAlertCard extends StatelessWidget {
  const _ComplianceAlertCard({required this.alert});

  final ComplianceAlert alert;

  @override
  Widget build(BuildContext context) {
    final isCritical = alert.severity == 'critical';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isCritical
            ? AppColors.error.withValues(alpha: 0.08)
            : AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCritical
              ? AppColors.error.withValues(alpha: 0.3)
              : AppColors.warning.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isCritical ? Icons.error_rounded : Icons.warning_amber_rounded,
            size: 20,
            color: isCritical ? AppColors.error : AppColors.warning,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.description,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// 通知プレビュータイル
// =============================================================================

class _NotificationPreviewTile extends ConsumerWidget {
  const _NotificationPreviewTile({required this.item});

  final NotificationItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final iconData = item.type.icon;
    final iconColor = item.type.color;

    return InkWell(
      onTap: () {
        if (!item.isRead) {
          ref.read(notificationControllerProvider.notifier).markAsRead(item.id);
        }
        if (item.actionUrl != null && item.actionUrl!.startsWith('/')) {
          context.push(item.actionUrl!);
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 14,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: !item.isRead
                    ? iconColor.withValues(alpha: 0.1)
                    : AppColors.divider(context),
                shape: BoxShape.circle,
              ),
              child: Icon(
                iconData,
                size: 20,
                color: !item.isRead
                    ? iconColor
                    : AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: !item.isRead
                          ? FontWeight.w600
                          : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.body != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.body!,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (!item.isRead)
              Container(
                margin: const EdgeInsets.only(left: AppSpacing.sm, top: 6),
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: AppColors.brand,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// CRM TODO セクション
// =============================================================================

class _CrmTodosSection extends ConsumerWidget {
  const _CrmTodosSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(bcMyTodosProvider);
    final todos = todosAsync.valueOrNull ?? [];
    final incompleteTodos = todos.where((t) => !t.isCompleted).toList();

    if (incompleteTodos.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    final displayTodos = incompleteTodos.take(3).toList();

    return SliverToBoxAdapter(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(
            title: 'CRM TODO（${incompleteTodos.length}件）',
            onShowAll: () => context.push(AppRoutes.tasks),
          ),
          ...displayTodos.map((todo) => _CrmTodoTile(todo: todo)),
        ],
      ),
    );
  }
}

class _CrmTodoTile extends StatelessWidget {
  const _CrmTodoTile({required this.todo});

  final BcTodo todo;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push(AppRoutes.tasks),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 12,
        ),
        child: Row(
          children: [
            Icon(
              Icons.radio_button_unchecked_rounded,
              size: 20,
              color: AppColors.brand,
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    todo.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (todo.contactName != null || todo.companyName != null)
                    Text(
                      [
                        todo.contactName,
                        todo.companyName,
                      ].where((e) => e != null).join(' / '),
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                  if (todo.dueDate != null)
                    Text(
                      '${todo.dueDate!.month}/${todo.dueDate!.day}',
                      style: AppTextStyles.caption2.copyWith(
                        color: todo.isOverdue
                            ? AppColors.error
                            : AppColors.textSecondary(context),
                      ),
                    ),
                ],
              ),
            ),
            const Icon(Icons.handshake, size: 16, color: AppColors.brand),
          ],
        ),
      ),
    );
  }
}
