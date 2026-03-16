import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../../company/presentation/widgets/section_renderers.dart';
import '../../domain/entities/job.dart';
import '../../domain/entities/job_step.dart';
import '../providers/applications_providers.dart';

/// 求人詳細画面（企業カスタマイズ対応）
class JobDetailScreen extends ConsumerWidget {
  const JobDetailScreen({super.key, required this.jobId});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncJob = ref.watch(jobDetailProvider(jobId));

    return asyncJob.when(
      data: (job) {
        if (job == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('求人詳細')),
            body: const Center(child: Text('求人情報が見つかりません')),
          );
        }

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              // ヘッダー
              _JobSliverAppBar(job: job),

              // セクション or フォールバック
              SliverPadding(
                padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
                sliver: job.sections.isNotEmpty
                    ? SliverList.separated(
                        itemCount: job.sections.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppSpacing.xl),
                        itemBuilder: (context, index) {
                          return SectionRenderer(
                              section: job.sections[index]);
                        },
                      )
                    : SliverToBoxAdapter(
                        child: Text(
                          job.description,
                          style: AppTextStyles.body.copyWith(height: 1.7),
                        ),
                      ),
              ),

              // 選考フロー
              if (job.selectionSteps.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.screenHorizontal),
                    child: _SelectionFlowCard(steps: job.selectionSteps),
                  ),
                ),

              // 下部余白
              const SliverToBoxAdapter(
                child: SizedBox(height: 100),
              ),
            ],
          ),

          // 応募ボタン（固定フッター）
          bottomNavigationBar: _ApplyBar(job: job),
        );
      },
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('求人詳細')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('求人詳細')),
        body: const Center(child: Text('エラーが発生しました')),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 選考フロー表示
// ---------------------------------------------------------------------------

class _SelectionFlowCard extends StatelessWidget {
  const _SelectionFlowCard({required this.steps});
  final List<JobStep> steps;

  @override
  Widget build(BuildContext context) {
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
          Text('選考フロー', style: AppTextStyles.subtitle),
          const SizedBox(height: AppSpacing.md),
          ...List.generate(steps.length, (index) {
            final step = steps[index];
            final isLast = index == steps.length - 1;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primaryLight.withValues(alpha: 0.15),
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.primaryLight,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 20,
                        color: theme.dividerColor,
                      ),
                  ],
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        Text(step.label, style: AppTextStyles.body),
                        if (step.stepType == 'external_test') ...[
                          const SizedBox(width: AppSpacing.sm),
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
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
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

// ---------------------------------------------------------------------------
// SliverAppBar ヘッダー
// ---------------------------------------------------------------------------

class _JobSliverAppBar extends StatelessWidget {
  const _JobSliverAppBar({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.primary,
                AppColors.primaryLight,
              ],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                48,
                AppSpacing.screenHorizontal,
                AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    job.title,
                    style: AppTextStyles.heading2.copyWith(
                      color: Colors.white,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.xs,
                    children: [
                      if (job.department != null)
                        _HeaderTag(job.department!),
                      if (job.location != null)
                        _HeaderTag(job.location!),
                      if (job.employmentType != null)
                        _HeaderTag(job.employmentType!),
                    ],
                  ),
                  if (job.salaryRange != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      job.salaryRange!,
                      style: AppTextStyles.body.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderTag extends StatelessWidget {
  const _HeaderTag(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: AppTextStyles.caption.copyWith(
          color: Colors.white.withValues(alpha: 0.9),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 固定フッター（応募ボタン）
// ---------------------------------------------------------------------------

class _ApplyBar extends ConsumerWidget {
  const _ApplyBar({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final asyncApplications = ref.watch(applicationsProvider);
    final alreadyApplied = asyncApplications.whenOrNull(
          data: (apps) => apps.any((a) => a.jobId == job.id),
        ) ??
        false;

    return Container(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.md,
        AppSpacing.screenHorizontal,
        MediaQuery.of(context).padding.bottom + AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: ElevatedButton(
          onPressed: alreadyApplied ? null : () => _showApplyDialog(context, ref),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: theme.colorScheme.onPrimary,
            disabledBackgroundColor: theme.dividerColor,
            disabledForegroundColor: theme.colorScheme.onSurfaceVariant,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            ),
          ),
          child: Text(
            alreadyApplied ? '応募済みです' : 'この求人に応募する',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
      ),
    );
  }

  void _showApplyDialog(BuildContext screenContext, WidgetRef ref) {
    showDialog(
      context: screenContext,
      builder: (dialogContext) => AlertDialog(
        title: const Text('応募確認'),
        content: Text('「${job.title}」に応募しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('キャンセル'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogContext);

              final org = ref.read(currentOrganizationProvider);
              if (org == null) return;

              final repo = ref.read(applicationsRepositoryProvider);
              await repo.apply(
                jobId: job.id,
                applicantId: ref.read(appUserProvider)!.id,
                organizationId: org.id,
              );

              ref.invalidate(applicationsProvider);

              if (!screenContext.mounted) return;
              ScaffoldMessenger.of(screenContext).showSnackBar(
                SnackBar(
                  content: Text('「${job.title}」に応募しました'),
                  backgroundColor: AppColors.success,
                ),
              );
              screenContext.go(AppRoutes.applications);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Theme.of(dialogContext).colorScheme.onPrimary,
            ),
            child: const Text('応募する'),
          ),
        ],
      ),
    );
  }
}
