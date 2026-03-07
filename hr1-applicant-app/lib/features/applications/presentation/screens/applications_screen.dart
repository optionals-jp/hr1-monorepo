import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../providers/applications_providers.dart';

/// 応募状況一覧画面（応募者専用）
class ApplicationsScreen extends ConsumerWidget {
  const ApplicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentOrg = ref.watch(currentOrganizationProvider);
    final asyncApplications = ref.watch(applicationsProvider);

    return Scaffold(
      body: currentOrg == null
          ? const Center(child: Text('企業が選択されていません'))
          : asyncApplications.when(
              data: (applications) => applications.isEmpty
                  ? _EmptyState(organizationName: currentOrg.name)
                  : _ApplicationsList(applications: applications),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => const Center(child: Text('エラーが発生しました')),
            ),
      floatingActionButton: currentOrg != null
          ? FloatingActionButton.extended(
              onPressed: () => context.push(AppRoutes.jobs),
              backgroundColor: AppColors.primaryLight,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              icon: const Icon(Icons.add),
              label: const Text('求人を探す'),
            )
          : null,
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.organizationName});
  final String organizationName;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.assignment_outlined,
              size: 64,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text('応募はまだありません', style: AppTextStyles.heading3),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '$organizationNameの求人を探して応募しましょう',
              style: AppTextStyles.bodySmall.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _ApplicationsList extends StatelessWidget {
  const _ApplicationsList({required this.applications});
  final List<Application> applications;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      itemCount: applications.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        return _ApplicationCard(application: applications[index]);
      },
    );
  }
}

class _ApplicationCard extends StatelessWidget {
  const _ApplicationCard({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: () {
        context.push('${AppRoutes.applications}/${application.id}');
      },
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
            Row(
              children: [
                Expanded(
                  child: Text(
                    application.job?.title ?? '求人情報なし',
                    style: AppTextStyles.subtitle,
                  ),
                ),
                _StatusChip(application: application),
              ],
            ),
            if (application.job?.department != null) ...[
              const SizedBox(height: AppSpacing.xs),
              Text(
                application.job!.department!,
                style: AppTextStyles.bodySmall.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Text(
                  '応募日: ${_formatDate(application.appliedAt)}',
                  style: AppTextStyles.caption.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const Spacer(),
                if (application.requiresAction)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '対応が必要',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.application});
  final Application application;

  @override
  Widget build(BuildContext context) {
    final chipColor = _getColor(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        application.currentStepLabel,
        style: AppTextStyles.caption.copyWith(
          color: chipColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getColor(BuildContext context) => switch (application.status) {
        ApplicationStatus.offered => AppColors.success,
        ApplicationStatus.rejected => AppColors.error,
        ApplicationStatus.withdrawn =>
          Theme.of(context).colorScheme.onSurfaceVariant,
        ApplicationStatus.active => application.requiresAction
            ? AppColors.warning
            : AppColors.primaryLight,
      };
}

String _formatDate(DateTime date) {
  return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
}
