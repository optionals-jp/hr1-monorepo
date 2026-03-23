import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/utils/date_formatter.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_status.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_step.dart';
import 'package:hr1_applicant_app/features/applications/presentation/controllers/application_detail_controller.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/forms/presentation/screens/form_fill_screen.dart';
import 'package:hr1_applicant_app/features/interviews/presentation/providers/interviews_providers.dart';
import 'package:hr1_applicant_app/features/todos/presentation/providers/todo_providers.dart';

/// 応募詳細画面
class ApplicationDetailScreen extends ConsumerWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(applicationDetailControllerProvider(applicationId));

    final asyncApplication = ref.watch(
      applicationDetailProvider(applicationId),
    );

    return CommonScaffold(
      body: asyncApplication.when(
        data: (application) {
          if (application == null) {
            return const Center(child: Text('応募情報が見つかりません'));
          }
          return _Body(application: application);
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () =>
              ref.invalidate(applicationDetailProvider(applicationId)),
        ),
      ),
    );
  }
}

// =============================================================================
// Body — タブ付きレイアウト
// =============================================================================

class _Body extends StatelessWidget {
  const _Body({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          // AppBar（戻るボタンのみ、常にピン留め）
          const SliverAppBar(pinned: true),
          // ヘッダー（スクロールで隠れる）
          SliverToBoxAdapter(child: _Header(application: application)),
          // タブバー（ピン留め）
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              const TabBar(
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: [
                  Tab(text: '概要'),
                  Tab(text: 'ステップ'),
                  Tab(text: '履歴'),
                  Tab(text: 'タスク'),
                ],
              ),
            ),
          ),
        ],
        body: TabBarView(
          children: [
            _OverviewTab(application: application),
            _StepsTab(application: application),
            _HistoryTab(application: application),
            _TasksTab(application: application),
          ],
        ),
      ),
    );
  }
}

// =============================================================================
// 概要タブ
// =============================================================================

class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final job = application.job;
    final currentStep = application.currentStep;
    final completedCount = application.steps
        .where((s) => s.status == StepStatus.completed)
        .length;
    final totalSteps = application.steps.length;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      children: [
        // 次のアクション
        if (currentStep != null && currentStep.requiresAction)
          _NextActionCard(application: application, step: currentStep),

        if (currentStep != null && currentStep.requiresAction)
          const SizedBox(height: AppSpacing.lg),

        // ステータスカード
        CommonCard(
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('選考状況', style: AppTextStyles.callout),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  StatusChip(
                    label: application.currentStepLabel,
                    color: _applicationColor(application, context),
                  ),
                  const Spacer(),
                  Text(
                    '$completedCount / $totalSteps ステップ完了',
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(theme.brightness),
                    ),
                  ),
                ],
              ),
              if (totalSteps > 0) ...[
                const SizedBox(height: AppSpacing.md),
                ClipRRect(
                  borderRadius: AppRadius.radius80,
                  child: LinearProgressIndicator(
                    value: totalSteps > 0 ? completedCount / totalSteps : 0,
                    minHeight: 6,
                    backgroundColor: AppColors.brand.withValues(alpha: 0.15),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.brand,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.lg),

        // 求人情報
        CommonCard(
          margin: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('求人情報', style: AppTextStyles.callout),
              const SizedBox(height: AppSpacing.md),
              _InfoRow(label: 'ポジション', value: job?.title ?? '-'),
              _InfoRow(label: '部署', value: job?.department ?? '-'),
              _InfoRow(label: '勤務地', value: job?.location ?? '-'),
              _InfoRow(label: '雇用形態', value: job?.employmentType ?? '-'),
              _InfoRow(
                label: '応募日',
                value: DateFormatter.toShortDate(application.appliedAt),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }
}

class _NextActionCard extends StatelessWidget {
  const _NextActionCard({required this.application, required this.step});
  final Application application;
  final ApplicationStep step;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.notifications_active_rounded,
                size: 18,
                color: AppColors.warning,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '次のアクション',
                style: AppTextStyles.callout.copyWith(color: AppColors.warning),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(_actionDescription(step), style: AppTextStyles.body2),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            child: CommonButton(
              onPressed: () => _navigateToStep(context, application, step),
              child: Text(_actionLabel(step)),
            ),
          ),
        ],
      ),
    );
  }

  String _actionLabel(ApplicationStep step) {
    return switch (step.stepType) {
      StepType.form => 'アンケートに回答する',
      StepType.interview => '面接日程を選択する',
      _ => step.label,
    };
  }

  String _actionDescription(ApplicationStep step) {
    return switch (step.stepType) {
      StepType.form => '「${step.label}」への回答が必要です。',
      StepType.interview => '面接の日程を選択してください。',
      _ => '「${step.label}」の対応が必要です。',
    };
  }

  void _navigateToStep(
    BuildContext context,
    Application application,
    ApplicationStep step,
  ) {
    if (step.relatedId == null) return;

    final basePath = '${AppRoutes.applications}/${application.id}';
    switch (step.stepType) {
      case StepType.form:
        showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (sheetContext) => FormFillScreen(
            formId: step.relatedId!,
            applicationId: application.id,
            stepId: step.id,
          ),
        );
      case StepType.interview:
        context.push('$basePath/interview/${step.relatedId}', extra: step.id);
      default:
        break;
    }
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
          ),
          Expanded(child: Text(value, style: AppTextStyles.body2)),
        ],
      ),
    );
  }
}

// =============================================================================
// ステップタブ
// =============================================================================

class _StepsTab extends ConsumerWidget {
  const _StepsTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final steps = application.steps;
    if (steps.isEmpty) {
      return Center(
        child: Text(
          '選考ステップがありません',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(theme.brightness),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: steps.length,
      itemBuilder: (context, index) {
        final step = steps[index];
        final isLast = index == steps.length - 1;
        return _StepCard(step: step, isLast: isLast);
      },
    );
  }
}

class _StepCard extends StatelessWidget {
  const _StepCard({required this.step, required this.isLast});
  final ApplicationStep step;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                _StepDot(step: step),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: step.status == StepStatus.completed
                          ? AppColors.success
                          : AppColors.divider(theme.brightness),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: step.status == StepStatus.inProgress
                    ? AppColors.brand.withValues(alpha: 0.05)
                    : theme.colorScheme.surface,
                borderRadius: AppRadius.radius120,
                border: Border.all(
                  color: step.status == StepStatus.inProgress
                      ? AppColors.brand.withValues(alpha: 0.2)
                      : AppColors.divider(theme.brightness),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          step.label,
                          style: AppTextStyles.body2.copyWith(
                            fontWeight: step.status == StepStatus.inProgress
                                ? FontWeight.w600
                                : FontWeight.w400,
                            color: step.status == StepStatus.pending
                                ? AppColors.textSecondary(theme.brightness)
                                : AppColors.textPrimary(theme.brightness),
                          ),
                        ),
                      ),
                      if (step.stepType == StepType.externalTest)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.textSecondary(
                              theme.brightness,
                            ).withValues(alpha: 0.1),
                            borderRadius: AppRadius.radius40,
                          ),
                          child: Text(
                            '外部',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(theme.brightness),
                            ),
                          ),
                        ),
                    ],
                  ),
                  if (step.requiresAction) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.warning,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '対応が必要です',
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.warning,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (step.stepType == StepType.interview &&
                      step.relatedId != null &&
                      step.status != StepStatus.pending)
                    _InterviewDateLabel(interviewId: step.relatedId!),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  const _StepDot({required this.step});
  final ApplicationStep step;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final (Color bg, Widget? icon) = switch (step.status) {
      StepStatus.completed => (
        AppColors.success,
        const Icon(Icons.check_rounded, size: 14, color: Colors.white),
      ),
      StepStatus.inProgress => (
        AppColors.brand,
        Container(
          width: 8,
          height: 8,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
      StepStatus.skipped => (
        AppColors.divider(theme.brightness),
        Icon(
          Icons.remove,
          size: 14,
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      StepStatus.pending => (AppColors.divider(theme.brightness), null),
    };

    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(shape: BoxShape.circle, color: bg),
      child: icon != null ? Center(child: icon) : null,
    );
  }
}

// =============================================================================
// 履歴タブ
// =============================================================================

class _HistoryTab extends StatelessWidget {
  const _HistoryTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final events = _buildHistoryEvents(application, theme);

    if (events.isEmpty) {
      return Center(
        child: Text(
          '履歴がありません',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(theme.brightness),
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: events.length,
      itemBuilder: (context, index) {
        final event = events[index];
        final isLast = index == events.length - 1;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 32,
                child: Column(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      margin: const EdgeInsets.only(top: 6),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: event.color.withValues(alpha: 0.2),
                        border: Border.all(
                          color: event.color,
                          width: AppStroke.strokeWidth20,
                        ),
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 1,
                          color: AppColors.lightDivider,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              event.title,
                              style: AppTextStyles.body2.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          Text(
                            DateFormatter.toDateTime(event.dateTime),
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(theme.brightness),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        event.subtitle,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<_HistoryEvent> _buildHistoryEvents(
    Application application,
    ThemeData theme,
  ) {
    final events = <_HistoryEvent>[];

    events.add(
      _HistoryEvent(
        title: '応募しました',
        subtitle: application.job?.title ?? '求人',
        dateTime: application.appliedAt,
        color: AppColors.brand,
      ),
    );

    for (final step in application.steps) {
      if (step.startedAt != null) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - 開始',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime: step.startedAt!,
            color: AppColors.brand,
          ),
        );
      }

      if (step.status == StepStatus.completed && step.completedAt != null) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - 完了',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime: step.completedAt!,
            color: AppColors.success,
          ),
        );
      }

      if (step.status == StepStatus.skipped) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - スキップ',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime:
                step.completedAt ?? step.startedAt ?? application.appliedAt,
            color: AppColors.textSecondary(theme.brightness),
          ),
        );
      }
    }

    events.sort((a, b) => b.dateTime.compareTo(a.dateTime));
    return events;
  }

  String _stepTypeLabel(StepType type) {
    return switch (type) {
      StepType.screening => '書類選考',
      StepType.form => 'アンケート/フォーム',
      StepType.interview => '面接',
      StepType.externalTest => '外部テスト',
      StepType.offer => '内定',
    };
  }
}

// =============================================================================
// タスクタブ
// =============================================================================

class _TasksTab extends ConsumerWidget {
  const _TasksTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final todosAsync = ref.watch(allTodosProvider);

    return todosAsync.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) =>
          ErrorState(onRetry: () => ref.invalidate(allTodosProvider)),
      data: (todos) {
        // この応募に関連するタスクをフィルタ
        final related = todos
            .where(
              (t) =>
                  t.sourceId == application.id ||
                  t.actionUrl?.contains(application.id) == true,
            )
            .toList();

        if (related.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.task_alt,
                  size: 48,
                  color: AppColors.textSecondary(theme.brightness),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'この応募に関連するタスクはありません',
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          itemCount: related.length,
          separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
          itemBuilder: (context, index) {
            final todo = related[index];
            return CommonCard(
              margin: EdgeInsets.zero,
              child: Row(
                children: [
                  Icon(
                    todo.isCompleted
                        ? Icons.check_circle
                        : Icons.radio_button_unchecked,
                    size: 22,
                    color: todo.isCompleted
                        ? AppColors.success
                        : AppColors.textSecondary(theme.brightness),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          todo.title,
                          style: AppTextStyles.body2.copyWith(
                            decoration: todo.isCompleted
                                ? TextDecoration.lineThrough
                                : null,
                            color: todo.isCompleted
                                ? AppColors.textSecondary(theme.brightness)
                                : null,
                          ),
                        ),
                        if (todo.dueDate != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            '期限: ${DateFormat('yyyy/MM/dd').format(todo.dueDate!)}',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(theme.brightness),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// =============================================================================
// Interview Date Label
// =============================================================================

class _InterviewDateLabel extends ConsumerWidget {
  const _InterviewDateLabel({required this.interviewId});
  final String interviewId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInterview = ref.watch(interviewDetailProvider(interviewId));

    return asyncInterview.when(
      data: (interview) {
        if (interview == null) return const SizedBox.shrink();
        final confirmedSlot = interview.confirmedSlot;
        if (confirmedSlot == null) {
          return Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              '日程調整中',
              style: AppTextStyles.caption2.copyWith(color: AppColors.warning),
            ),
          );
        }
        final dateFormat = DateFormat('M月d日(E) HH:mm', 'ja');
        final timeFormat = DateFormat('HH:mm');
        return Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            children: [
              Icon(Icons.event_rounded, size: 14, color: AppColors.success),
              const SizedBox(width: 4),
              Text(
                '${dateFormat.format(confirmedSlot.startAt)} 〜 ${timeFormat.format(confirmedSlot.endAt)}',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

// =============================================================================
// Header
// =============================================================================

class _Header extends StatelessWidget {
  const _Header({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final job = application.job;
    final color = _applicationColor(application, context);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.lg,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (job != null)
                OrgIcon(
                  initial: job.title.isNotEmpty ? job.title[0] : '?',
                  size: 48,
                  borderRadius: 12,
                ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job?.title ?? '求人',
                      style: AppTextStyles.headline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    if (job?.department != null)
                      Text(
                        job!.department!,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              StatusChip(label: application.currentStepLabel, color: color),
              const SizedBox(width: 12),
              Text(
                '応募日 ${DateFormatter.toShortDate(application.appliedAt)}',
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Shared

// =============================================================================

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  const _TabBarDelegate(this.tabBar);
  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Material(
      color: Theme.of(context).colorScheme.surface,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}

class _HistoryEvent {
  const _HistoryEvent({
    required this.title,
    required this.subtitle,
    required this.dateTime,
    required this.color,
  });

  final String title;
  final String subtitle;
  final DateTime dateTime;
  final Color color;
}

Color _applicationColor(Application application, BuildContext context) {
  return switch (application.status) {
    ApplicationStatus.offered => AppColors.success,
    ApplicationStatus.rejected => AppColors.error,
    ApplicationStatus.withdrawn => AppColors.textSecondary(
      Theme.of(context).brightness,
    ),
    ApplicationStatus.active => () {
      if (application.requiresAction) return AppColors.warning;
      return AppColors.brand;
    }(),
  };
}
