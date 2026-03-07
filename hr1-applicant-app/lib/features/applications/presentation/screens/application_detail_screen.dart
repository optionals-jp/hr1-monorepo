import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../providers/applications_providers.dart';

/// 応募詳細画面
class ApplicationDetailScreen extends ConsumerWidget {
  const ApplicationDetailScreen({super.key, required this.applicationId});

  final String applicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncApplication = ref.watch(applicationDetailProvider(applicationId));

    return asyncApplication.when(
      data: (application) {
        if (application == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('応募詳細')),
            body: const Center(child: Text('応募情報が見つかりません')),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('応募詳細'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ステータスバッジ
                _StatusBadge(status: application.status),
                const SizedBox(height: AppSpacing.lg),

                // 求人情報カード
                if (application.job != null) ...[
                  _JobInfoCard(application: application),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // タイムライン
                _StatusTimeline(status: application.status),
                const SizedBox(height: AppSpacing.xl),

                // アクションボタン
                _ActionSection(application: application),
              ],
            ),
          ),
        );
      },
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => const Scaffold(body: Center(child: Text('エラーが発生しました'))),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final ApplicationStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: _statusColor(status, context).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        border: Border.all(color: _statusColor(status, context).withValues(alpha: 0.3)),
      ),
      child: Text(
        status.label,
        style: AppTextStyles.label.copyWith(
          color: _statusColor(status, context),
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

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({required this.status});
  final ApplicationStatus status;

  static const _steps = [
    ApplicationStatus.screening,
    ApplicationStatus.formPending,
    ApplicationStatus.interviewScheduling,
    ApplicationStatus.interviewScheduled,
    ApplicationStatus.interviewCompleted,
    ApplicationStatus.offered,
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = _steps.indexOf(status);
    final theme = Theme.of(context);

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
          ...List.generate(_steps.length, (index) {
            final step = _steps[index];
            final isCompleted = currentIndex > index;
            final isCurrent = currentIndex == index;
            final isLast = index == _steps.length - 1;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCompleted
                            ? AppColors.success
                            : isCurrent
                                ? AppColors.primaryLight
                                : theme.dividerColor,
                      ),
                      child: isCompleted
                          ? const Icon(Icons.check,
                              size: 14, color: Colors.white)
                          : isCurrent
                              ? const Icon(Icons.circle,
                                  size: 8, color: Colors.white)
                              : null,
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 32,
                        color: isCompleted
                            ? AppColors.success
                            : theme.dividerColor,
                      ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    step.label,
                    style: isCurrent
                        ? AppTextStyles.body
                            .copyWith(fontWeight: FontWeight.w600)
                        : AppTextStyles.body.copyWith(
                            color: isCompleted
                                ? theme.colorScheme.onSurface
                                : theme.colorScheme.onSurfaceVariant,
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

class _ActionSection extends StatelessWidget {
  const _ActionSection({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[];

    if (application.status == ApplicationStatus.formPending &&
        application.pendingFormId != null) {
      actions.add(
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              context.push(
                '${AppRoutes.applications}/${application.id}/form/${application.pendingFormId}',
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryLight,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              ),
            ),
            child: const Text('アンケートに回答する'),
          ),
        ),
      );
    }

    if (application.status == ApplicationStatus.interviewScheduling &&
        application.interviewId != null) {
      actions.add(
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () {
              context.push(
                '${AppRoutes.applications}/${application.id}/interview/${application.interviewId}',
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primaryLight,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              ),
            ),
            child: const Text('面接日程を選択する'),
          ),
        ),
      );
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return Column(children: actions);
  }
}

Color _statusColor(ApplicationStatus status, BuildContext context) {
  return switch (status) {
    ApplicationStatus.screening => AppColors.primaryLight,
    ApplicationStatus.formPending => AppColors.warning,
    ApplicationStatus.interviewScheduling => AppColors.warning,
    ApplicationStatus.interviewScheduled => AppColors.primaryLight,
    ApplicationStatus.interviewCompleted => AppColors.success,
    ApplicationStatus.offered => AppColors.success,
    ApplicationStatus.rejected => AppColors.error,
    ApplicationStatus.withdrawn => Theme.of(context).colorScheme.onSurfaceVariant,
  };
}

String _formatDate(DateTime date) {
  return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
}
