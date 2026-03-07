import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../company/presentation/widgets/section_renderers.dart';
import '../../domain/entities/job.dart';
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
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => const Scaffold(body: Center(child: Text('エラーが発生しました'))),
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

class _ApplyBar extends StatelessWidget {
  const _ApplyBar({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
          onPressed: () => _showApplyDialog(context),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: theme.colorScheme.onPrimary,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            ),
          ),
          child: const Text('この求人に応募する',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
      ),
    );
  }

  void _showApplyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('応募確認'),
        content: Text('「${job.title}」に応募しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('キャンセル'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('「${job.title}」に応募しました'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
            ),
            child: const Text('応募する'),
          ),
        ],
      ),
    );
  }
}
