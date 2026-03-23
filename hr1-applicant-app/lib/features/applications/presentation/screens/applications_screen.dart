import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_applicant_app/core/utils/date_formatter.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_status.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_step.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/job.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';

/// 応募状況一覧画面
class ApplicationsScreen extends ConsumerWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final asyncInProgress = ref.watch(inProgressApplicationsProvider);
    final asyncCompleted = ref.watch(completedApplicationsProvider);
    final asyncAvailableJobs = ref.watch(availableJobsProvider);

    if (currentOrg == null) {
      return const Scaffold(body: Center(child: Text('企業が選択されていません')));
    }

    return CommonScaffold(
      body: asyncInProgress.when(
        data: (inProgress) {
          final completed = asyncCompleted.valueOrNull ?? [];
          final availableJobs = asyncAvailableJobs.valueOrNull ?? [];
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(applicationsProvider);
              ref.invalidate(jobsProvider);
            },
            child: _Body(
              inProgress: inProgress,
              completed: completed,
              availableJobs: availableJobs,
              organizationName: currentOrg.name,
            ),
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(applicationsProvider)),
      ),
    );
  }
}

// =============================================================================
// Body
// =============================================================================

class _Body extends StatelessWidget {
  const _Body({
    required this.inProgress,
    required this.completed,
    required this.availableJobs,
    required this.organizationName,
  });

  final List<Application> inProgress;
  final List<Application> completed;
  final List<Job> availableJobs;
  final String organizationName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasApplications = inProgress.isNotEmpty || completed.isNotEmpty;

    return ListView(
      padding: const EdgeInsets.only(top: AppSpacing.md, bottom: 40),
      children: [
        // 進行中セクション
        if (inProgress.isNotEmpty) ...[
          _SectionHeader(
            title: '進行中',
            count: inProgress.length,
            color: AppColors.brand,
          ),
          ...inProgress.map((a) => _ApplicationCard(application: a)),
          const SizedBox(height: AppSpacing.xl),
        ],

        // 完了セクション
        if (completed.isNotEmpty) ...[
          _SectionHeader(
            title: '完了',
            count: completed.length,
            color: AppColors.textSecondary(theme.brightness),
          ),
          ...completed.map((a) => _ApplicationCard(application: a)),
          const SizedBox(height: AppSpacing.xl),
        ],

        // 求人セクション
        if (availableJobs.isNotEmpty) ...[
          _SectionHeader(
            title: '募集中の求人',
            count: availableJobs.length,
            color: AppColors.brandLight,
          ),
          ...availableJobs.map((j) => _JobCard(job: j)),
        ],

        // 応募なし＋求人なしの場合の空状態
        if (!hasApplications && availableJobs.isEmpty)
          _EmptyState(organizationName: organizationName),
      ],
    );
  }
}

// =============================================================================
// Empty State
// =============================================================================

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.organizationName});
  final String organizationName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xxl),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 40),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.brand.withValues(alpha: 0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.description_outlined,
              size: 36,
              color: AppColors.brand.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 20),
          Text('応募はまだありません', style: AppTextStyles.headline),
          const SizedBox(height: 8),
          Text(
            '$organizationNameの求人を探して\n応募してみましょう',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(theme.brightness),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Section Header
// =============================================================================

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.count,
    required this.color,
  });
  final String title;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(
              color: color,
              borderRadius: AppRadius.radius40,
            ),
          ),
          const SizedBox(width: 8),
          Text(title, style: AppTextStyles.footnote),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: AppRadius.radius80,
            ),
            child: Text(
              '$count',
              style: AppTextStyles.caption2.copyWith(
                color: color,
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
// Application Card
// =============================================================================

class _ApplicationCard extends StatelessWidget {
  const _ApplicationCard({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final job = application.job;
    final statusColor = _statusColor(application, context);
    final steps = application.steps;
    final completedSteps = steps
        .where((s) => s.status == StepStatus.completed)
        .length;
    final totalSteps = steps.length;
    final progress = totalSteps > 0 ? completedSteps / totalSteps : 0.0;

    return CommonCard(
      onTap: () => context.push('${AppRoutes.applications}/${application.id}'),
      highlighted: application.requiresAction,
      highlightColor: AppColors.warning,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              OrgIcon(
                initial: job != null && job.title.isNotEmpty
                    ? job.title[0]
                    : '?',
                size: 40,
                borderRadius: 10,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      job?.title ?? '求人情報なし',
                      style: AppTextStyles.body1.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (job?.department != null)
                      Text(
                        job!.department!,
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusChip(
                label: application.currentStepLabel,
                color: statusColor,
              ),
            ],
          ),

          const SizedBox(height: 14),

          if (totalSteps > 0 &&
              application.status == ApplicationStatus.active) ...[
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: AppRadius.radius40,
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 4,
                      backgroundColor: AppColors.divider(
                        theme.brightness,
                      ).withValues(alpha: 0.5),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        application.requiresAction
                            ? AppColors.warning
                            : AppColors.brand,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  '$completedSteps/$totalSteps',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],

          Row(
            children: [
              Icon(
                Icons.schedule_rounded,
                size: 14,
                color: AppColors.textSecondary(theme.brightness),
              ),
              const SizedBox(width: 4),
              Text(
                DateFormatter.toDateSlash(application.appliedAt),
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
              const Spacer(),
              if (application.requiresAction)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: AppRadius.radius80,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.warning,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '対応が必要',
                        style: AppTextStyles.caption2.copyWith(
                          color: AppColors.warning,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.textSecondary(theme.brightness),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Job Card
// =============================================================================

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CommonCard(
      onTap: () => context.push('${AppRoutes.jobs}/${job.id}'),
      child: Row(
        children: [
          OrgIcon(
            initial: job.title.isNotEmpty ? job.title[0] : '?',
            size: 40,
            borderRadius: 10,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  job.title,
                  style: AppTextStyles.body1.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (job.department != null) job.department!,
                    if (job.location != null) job.location!,
                    if (job.employmentType != null) job.employmentType!,
                  ].join(' · '),
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.brand,
              borderRadius: AppRadius.radius120,
            ),
            child: Text(
              '詳細',
              style: AppTextStyles.caption2.copyWith(
                color: Colors.white,
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
// Helpers
// =============================================================================

Color _statusColor(Application application, BuildContext context) {
  return switch (application.status) {
    ApplicationStatus.offered => AppColors.success,
    ApplicationStatus.rejected => AppColors.error,
    ApplicationStatus.withdrawn => AppColors.textSecondary(
      Theme.of(context).brightness,
    ),
    ApplicationStatus.active =>
      application.requiresAction ? AppColors.warning : AppColors.brand,
  };
}
