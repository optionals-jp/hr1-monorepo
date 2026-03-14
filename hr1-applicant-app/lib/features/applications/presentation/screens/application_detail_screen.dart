import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../../domain/entities/application_step.dart';
import '../providers/applications_providers.dart';
import '../../../forms/presentation/screens/form_fill_screen.dart';
import '../../../interviews/presentation/providers/interviews_providers.dart';

/// 応募詳細画面
class ApplicationDetailScreen extends ConsumerStatefulWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  ConsumerState<ApplicationDetailScreen> createState() =>
      _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState
    extends ConsumerState<ApplicationDetailScreen> {
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _subscribeToStepChanges();
  }

  void _subscribeToStepChanges() {
    _channel = Supabase.instance.client
        .channel('application_steps:${widget.applicationId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'application_steps',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'application_id',
            value: widget.applicationId,
          ),
          callback: (payload) {
            ref.invalidate(applicationDetailProvider(widget.applicationId));
          },
        )
        .subscribe();
  }

  @override
  void dispose() {
    if (_channel != null) {
      Supabase.instance.client.removeChannel(_channel!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asyncApplication =
        ref.watch(applicationDetailProvider(widget.applicationId));

    return Scaffold(
      appBar: AppBar(title: const Text('応募詳細')),
      body: asyncApplication.when(
        data: (application) {
          if (application == null) {
            return const Center(child: Text('応募情報が見つかりません'));
          }

          return _ApplicationDetailBody(application: application);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('エラーが発生しました'),
              const SizedBox(height: AppSpacing.md),
              TextButton(
                onPressed: () => ref.invalidate(
                    applicationDetailProvider(widget.applicationId)),
                child: const Text('再試行'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ApplicationDetailBody extends StatefulWidget {
  const _ApplicationDetailBody({required this.application});
  final Application application;

  @override
  State<_ApplicationDetailBody> createState() =>
      _ApplicationDetailBodyState();
}

class _ApplicationDetailBodyState extends State<_ApplicationDetailBody>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final application = widget.application;

    return Column(
      children: [
        // ヘッダー部分（スクロールしない）
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.screenHorizontal,
            AppSpacing.screenHorizontal,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _StatusBadge(application: application),
              const SizedBox(height: AppSpacing.lg),
              if (application.job != null) ...[
                _JobInfoCard(application: application),
                const SizedBox(height: AppSpacing.lg),
              ],
            ],
          ),
        ),

        // タブバー
        TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '選考ステップ'),
            Tab(text: '履歴'),
          ],
          labelColor: Theme.of(context).colorScheme.onSurface,
          unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
          indicatorColor: AppColors.primaryLight,
        ),

        // タブコンテンツ
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              // 選考ステップタブ
              SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                child: Column(
                  children: [
                    _StepTimeline(application: application),
                    const SizedBox(height: AppSpacing.xl),
                    _ActionSection(application: application),
                  ],
                ),
              ),

              // 履歴タブ
              _HistoryTab(application: application),
            ],
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final color = _applicationColor(application, context);
    final label = application.currentStepLabel;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: AppTextStyles.label.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _JobInfoCard extends StatelessWidget {
  const _JobInfoCard({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final job = application.job!;
    final theme = Theme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(job.title, style: AppTextStyles.subtitle),
          const SizedBox(height: AppSpacing.sm),
          if (job.department != null)
            _InfoRow(icon: Icons.business, text: job.department!),
          if (job.location != null)
            _InfoRow(icon: Icons.location_on_outlined, text: job.location!),
          if (job.employmentType != null)
            _InfoRow(icon: Icons.work_outline, text: job.employmentType!),
          if (job.salaryRange != null)
            _InfoRow(icon: Icons.payments_outlined, text: job.salaryRange!),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '応募日: ${DateFormatter.toShortDate(application.appliedAt)}',
            style: AppTextStyles.caption.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        children: [
          Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(text, style: AppTextStyles.bodySmall.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            )),
          ),
        ],
      ),
    );
  }
}

/// 動的な選考ステップタイムライン
class _StepTimeline extends ConsumerWidget {
  const _StepTimeline({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final steps = application.steps;

    if (steps.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('選考ステップ', style: AppTextStyles.subtitle),
          const SizedBox(height: AppSpacing.lg),
          ...List.generate(steps.length, (index) {
            final step = steps[index];
            final isLast = index == steps.length - 1;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    _StepIndicator(step: step),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: _stepLineHeight(step),
                        color: step.status == StepStatus.completed
                            ? AppColors.success
                            : theme.dividerColor,
                      ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                step.label,
                                style: step.status == StepStatus.inProgress
                                    ? AppTextStyles.body.copyWith(
                                        fontWeight: FontWeight.w600)
                                    : AppTextStyles.body.copyWith(
                                        color: step.status ==
                                                StepStatus.completed
                                            ? theme.colorScheme.onSurface
                                            : theme.colorScheme
                                                .onSurfaceVariant,
                                      ),
                              ),
                            ),
                            if (step.stepType == StepType.externalTest)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.onSurfaceVariant
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '外部',
                                  style: AppTextStyles.caption.copyWith(
                                    color:
                                        theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        if (step.requiresAction) ...[
                          const SizedBox(height: 2),
                          Text(
                            '対応が必要です',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.warning,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        // 面接ステップ: 確定した日程を表示
                        if (step.stepType == StepType.interview &&
                            step.relatedId != null &&
                            step.status != StepStatus.pending)
                          _InterviewDateLabel(
                            interviewId: step.relatedId!,
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  double _stepLineHeight(ApplicationStep step) {
    if (step.stepType == StepType.interview &&
        step.relatedId != null &&
        step.status != StepStatus.pending) {
      return 48;
    }
    return 32;
  }
}

/// 面接の確定日時を表示するウィジェット
class _InterviewDateLabel extends ConsumerWidget {
  const _InterviewDateLabel({
    required this.interviewId,
  });
  final String interviewId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncInterview = ref.watch(interviewDetailProvider(interviewId));

    return asyncInterview.when(
      data: (interview) {
        if (interview == null) return const SizedBox.shrink();
        final confirmedSlot = interview.confirmedSlot;
        if (confirmedSlot == null) {
          // 日程未確定
          return Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              '日程調整中',
              style: AppTextStyles.caption.copyWith(
                color: AppColors.warning,
              ),
            ),
          );
        }
        final dateFormat = DateFormat('M月d日(E) HH:mm', 'ja');
        final timeFormat = DateFormat('HH:mm');
        return Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Row(
            children: [
              Icon(Icons.event, size: 14, color: AppColors.success),
              const SizedBox(width: 4),
              Text(
                '${dateFormat.format(confirmedSlot.startAt)} 〜 ${timeFormat.format(confirmedSlot.endAt)}',
                style: AppTextStyles.caption.copyWith(
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

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});
  final ApplicationStep step;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color bgColor;
    Widget? child;

    switch (step.status) {
      case StepStatus.completed:
        bgColor = AppColors.success;
        child = const Icon(Icons.check, size: 14, color: Colors.white);
      case StepStatus.inProgress:
        bgColor = AppColors.primaryLight;
        child = const Icon(Icons.circle, size: 8, color: Colors.white);
      case StepStatus.skipped:
        bgColor = theme.dividerColor;
        child = Icon(Icons.remove, size: 14,
            color: theme.colorScheme.onSurfaceVariant);
      case StepStatus.pending:
        bgColor = theme.dividerColor;
        child = null;
    }

    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: bgColor,
      ),
      child: child,
    );
  }
}

class _ActionSection extends StatelessWidget {
  const _ActionSection({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    // 最初の in_progress ステップのみアクション可能（順序を強制）
    final currentStep = application.currentStep;
    final actionSteps = (currentStep != null && currentStep.requiresAction)
        ? [currentStep]
        : <ApplicationStep>[];

    if (actionSteps.isEmpty) return const SizedBox.shrink();

    return Column(
      children: actionSteps.map((step) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.md),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _navigateToStep(context, application, step),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryLight,
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                ),
              ),
              child: Text(_actionLabel(step)),
            ),
          ),
        );
      }).toList(),
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
      BuildContext context, Application application, ApplicationStep step) {
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
        context.push('$basePath/interview/${step.relatedId}',
            extra: step.id);
      default:
        break;
    }
  }
}

/// 履歴タブ：ステップの変更履歴を時系列で表示
class _HistoryTab extends StatelessWidget {
  const _HistoryTab({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final events = _buildHistoryEvents(application);

    if (events.isEmpty) {
      return Center(
        child: Text('履歴がありません', style: AppTextStyles.body),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: events.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final event = events[index];
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // アイコン
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: event.color.withValues(alpha: 0.1),
                ),
                child: Icon(event.icon, size: 16, color: event.color),
              ),
              const SizedBox(width: AppSpacing.md),
              // 内容
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(event.title, style: AppTextStyles.body.copyWith(
                      fontWeight: FontWeight.w600,
                    )),
                    const SizedBox(height: 2),
                    Text(event.subtitle, style: AppTextStyles.bodySmall.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    )),
                  ],
                ),
              ),
              // 日時
              Text(
                _formatDateTime(event.dateTime),
                style: AppTextStyles.caption.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  List<_HistoryEvent> _buildHistoryEvents(Application application) {
    final events = <_HistoryEvent>[];

    // 応募イベント
    events.add(_HistoryEvent(
      title: '応募しました',
      subtitle: application.job?.title ?? '求人',
      dateTime: application.appliedAt,
      icon: Icons.send,
      color: AppColors.primaryLight,
    ));

    // 各ステップのイベント
    for (final step in application.steps) {
      if (step.startedAt != null) {
        events.add(_HistoryEvent(
          title: '${step.label} - 開始',
          subtitle: _stepTypeLabel(step.stepType),
          dateTime: step.startedAt!,
          icon: Icons.play_circle_outline,
          color: AppColors.primaryLight,
        ));
      }

      if (step.status == StepStatus.completed && step.completedAt != null) {
        events.add(_HistoryEvent(
          title: '${step.label} - 完了',
          subtitle: _stepTypeLabel(step.stepType),
          dateTime: step.completedAt!,
          icon: Icons.check_circle_outline,
          color: AppColors.success,
        ));
      }

      if (step.status == StepStatus.skipped) {
        events.add(_HistoryEvent(
          title: '${step.label} - スキップ',
          subtitle: _stepTypeLabel(step.stepType),
          dateTime: step.completedAt ?? step.startedAt ?? application.appliedAt,
          icon: Icons.skip_next,
          color: Colors.grey,
        ));
      }
    }

    // 日時の新しい順にソート
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
    required this.icon,
    required this.color,
  });

  final String title;
  final String subtitle;
  final DateTime dateTime;
  final IconData icon;
  final Color color;
}

Color _applicationColor(Application application, BuildContext context) {
  return switch (application.status) {
    ApplicationStatus.offered => AppColors.success,
    ApplicationStatus.rejected => AppColors.error,
    ApplicationStatus.withdrawn =>
      Theme.of(context).colorScheme.onSurfaceVariant,
    ApplicationStatus.active => () {
        if (application.requiresAction) return AppColors.warning;
        return AppColors.primaryLight;
      }(),
  };
}

