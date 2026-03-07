import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../../domain/entities/application_step.dart';
import '../providers/applications_providers.dart';

/// 応募詳細画面
class ApplicationDetailScreen extends ConsumerWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncApplication = ref.watch(applicationDetailProvider(applicationId));

    return Scaffold(
      appBar: AppBar(title: const Text('応募詳細')),
      body: asyncApplication.when(
        data: (application) {
          if (application == null) {
            return const Center(child: Text('応募情報が見つかりません'));
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ステータスバッジ
                _StatusBadge(application: application),
                const SizedBox(height: AppSpacing.lg),

                // 求人情報カード
                if (application.job != null) ...[
                  _JobInfoCard(application: application),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // タイムライン（動的）
                _StepTimeline(application: application),
                const SizedBox(height: AppSpacing.xl),

                // アクションボタン
                _ActionSection(application: application),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('エラーが発生しました')),
      ),
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
            '応募日: ${_formatDate(application.appliedAt)}',
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
class _StepTimeline extends StatelessWidget {
  const _StepTimeline({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
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
                        height: 32,
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
    // 現在進行中でアクションが必要なステップを見つける
    final actionSteps =
        application.steps.where((s) => s.requiresAction).toList();

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
        context.push('$basePath/form/${step.relatedId}',
            extra: step.id);
      case StepType.interview:
        context.push('$basePath/interview/${step.relatedId}',
            extra: step.id);
      default:
        break;
    }
  }
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

String _formatDate(DateTime date) {
  return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
}
