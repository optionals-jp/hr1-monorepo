import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../../domain/entities/application_step.dart';
import '../controllers/application_detail_controller.dart';
import '../providers/applications_providers.dart';
import '../../../forms/presentation/screens/form_fill_screen.dart';
import '../../../interviews/presentation/providers/interviews_providers.dart';

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

    return Scaffold(
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
// Body
// =============================================================================

class _Body extends StatelessWidget {
  const _Body({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        // ヘッダー（SliverAppBar）
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          backgroundColor: theme.colorScheme.surface,
          flexibleSpace: FlexibleSpaceBar(
            background: _Header(application: application),
          ),
          title: Text(
            application.job?.title ?? '応募詳細',
            style: AppTextStyles.callout,
          ),
        ),

        // アクションボタン
        SliverToBoxAdapter(child: _ActionSection(application: application)),

        // 選考ステップ
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.lg,
              AppSpacing.screenHorizontal,
              0,
            ),
            child: Text('選考ステップ', style: AppTextStyles.callout),
          ),
        ),

        SliverPadding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.md,
          ),
          sliver: _StepsList(application: application),
        ),

        // 履歴セクション
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.lg,
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
            ),
            child: Text('履歴', style: AppTextStyles.callout),
          ),
        ),

        _HistorySection(application: application),

        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxxl)),
      ],
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

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primaryLight.withValues(alpha: 0.08),
            theme.colorScheme.surface,
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            60,
            AppSpacing.screenHorizontal,
            AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.end,
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
                              color: AppColors.textSecondary,
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
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Action Section
// =============================================================================

class _ActionSection extends StatelessWidget {
  const _ActionSection({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final currentStep = application.currentStep;
    if (currentStep == null || !currentStep.requiresAction) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.lg,
        AppSpacing.screenHorizontal,
        0,
      ),
      child: CommonButton(
        onPressed: () => _navigateToStep(context, application, currentStep),
        child: Text(_actionLabel(currentStep)),
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

// =============================================================================
// Steps List (SliverList)
// =============================================================================

class _StepsList extends ConsumerWidget {
  const _StepsList({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final steps = application.steps;
    if (steps.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverList.builder(
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
          // タイムラインインジケーター
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
                          : theme.dividerColor,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // ステップ内容
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: step.status == StepStatus.inProgress
                    ? AppColors.primaryLight.withValues(alpha: 0.05)
                    : theme.colorScheme.surface,
                borderRadius: AppRadius.radius120,
                border: Border.all(
                  color: step.status == StepStatus.inProgress
                      ? AppColors.primaryLight.withValues(alpha: 0.2)
                      : theme.dividerColor,
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
                                ? AppColors.textSecondary
                                : theme.colorScheme.onSurface,
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
                            color: AppColors.textSecondary.withValues(
                              alpha: 0.1,
                            ),
                            borderRadius: AppRadius.radius40,
                          ),
                          child: Text(
                            '外部',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary,
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
        AppColors.primaryLight,
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
        theme.dividerColor,
        Icon(Icons.remove, size: 14, color: theme.colorScheme.onSurfaceVariant),
      ),
      StepStatus.pending => (theme.dividerColor, null),
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
// History Section (SliverList)
// =============================================================================

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final events = _buildHistoryEvents(application);

    if (events.isEmpty) {
      return SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Text(
              '履歴がありません',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      sliver: SliverList.builder(
        itemCount: events.length,
        itemBuilder: (context, index) {
          final event = events[index];
          final isLast = index == events.length - 1;

          return IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // タイムラインドット
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
                          child: Container(width: 1, color: AppColors.divider),
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
                              _formatDateTime(event.dateTime),
                              style: AppTextStyles.caption2.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          event.subtitle,
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary,
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
      ),
    );
  }

  List<_HistoryEvent> _buildHistoryEvents(Application application) {
    final events = <_HistoryEvent>[];

    events.add(
      _HistoryEvent(
        title: '応募しました',
        subtitle: application.job?.title ?? '求人',
        dateTime: application.appliedAt,
        color: AppColors.primaryLight,
      ),
    );

    for (final step in application.steps) {
      if (step.startedAt != null) {
        events.add(
          _HistoryEvent(
            title: '${step.label} - 開始',
            subtitle: _stepTypeLabel(step.stepType),
            dateTime: step.startedAt!,
            color: AppColors.primaryLight,
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
            color: AppColors.textSecondary,
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

  String _formatDateTime(DateTime date) {
    return DateFormatter.toDateTime(date);
  }
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
    ApplicationStatus.withdrawn => AppColors.textSecondary,
    ApplicationStatus.active => () {
      if (application.requiresAction) return AppColors.warning;
      return AppColors.primaryLight;
    }(),
  };
}
