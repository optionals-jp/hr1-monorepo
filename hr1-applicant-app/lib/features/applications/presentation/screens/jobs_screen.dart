import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../domain/entities/job.dart';
import '../providers/applications_providers.dart';

/// 求人一覧画面
class JobsScreen extends ConsumerWidget {
  const JobsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final asyncJobs = ref.watch(jobsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('${currentOrg?.name ?? ''}の求人'),
      ),
      body: asyncJobs.when(
        data: (jobs) => jobs.isEmpty
            ? Center(
                child: Text(
                  '現在募集中の求人はありません',
                  style: AppTextStyles.body.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                itemCount: jobs.length,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.md),
                itemBuilder: (context, index) {
                  return _JobCard(job: jobs[index]);
                },
              ),
        loading: () => const LoadingIndicator(),
        error: (e, _) => const Center(child: Text('エラーが発生しました')),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: () => context.push('${AppRoutes.jobs}/${job.id}'),
      borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
      child: Container(
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
            Text(
              job.description,
              style: AppTextStyles.bodySmall.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.xs,
              children: [
                if (job.department != null) _Tag(job.department!),
                if (job.location != null) _Tag(job.location!),
                if (job.employmentType != null) _Tag(job.employmentType!),
              ],
            ),
            if (job.salaryRange != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                job.salaryRange!,
                style: AppTextStyles.body.copyWith(
                  color: AppColors.primaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '詳細を見る',
                    style: AppTextStyles.body.copyWith(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(Icons.arrow_forward_ios,
                    size: 14, color: AppColors.primaryLight),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(text, style: AppTextStyles.caption.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      )),
    );
  }
}
