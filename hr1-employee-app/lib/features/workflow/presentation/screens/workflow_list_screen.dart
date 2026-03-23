import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/providers/workflow_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:intl/intl.dart';

/// 各種申請一覧画面
class WorkflowListScreen extends ConsumerWidget {
  const WorkflowListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 4,
      child: CommonScaffold(
        appBar: AppBar(
          title: Text('各種申請', style: AppTextStyles.headline),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'すべて'),
              Tab(text: '承認待ち'),
              Tab(text: '承認済み'),
              Tab(text: '却下'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _RequestTab(status: null),
            _RequestTab(status: WorkflowRequestStatus.pending),
            _RequestTab(status: WorkflowRequestStatus.approved),
            _RequestTab(status: WorkflowRequestStatus.rejected),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => _showCreateSheet(context),
          child: const Icon(Icons.add),
        ),
      ),
    );
  }

  void _showCreateSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  child: Text('申請を作成', style: AppTextStyles.headline),
                ),
                const SizedBox(height: AppSpacing.md),
                _CreateOption(
                  icon: Icons.beach_access_rounded,
                  label: '有給休暇',
                  onTap: () {
                    Navigator.pop(context);
                    context.push(
                      AppRoutes.workflowCreate,
                      extra: WorkflowRequestType.paidLeave,
                    );
                  },
                ),
                _CreateOption(
                  icon: Icons.schedule_rounded,
                  label: '残業申請',
                  onTap: () {
                    Navigator.pop(context);
                    context.push(
                      AppRoutes.workflowCreate,
                      extra: WorkflowRequestType.overtime,
                    );
                  },
                ),
                _CreateOption(
                  icon: Icons.flight_rounded,
                  label: '出張申請',
                  onTap: () {
                    Navigator.pop(context);
                    context.push(
                      AppRoutes.workflowCreate,
                      extra: WorkflowRequestType.businessTrip,
                    );
                  },
                ),
                _CreateOption(
                  icon: Icons.receipt_long_rounded,
                  label: '経費申請',
                  onTap: () {
                    Navigator.pop(context);
                    context.push(
                      AppRoutes.workflowCreate,
                      extra: WorkflowRequestType.expense,
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CreateOption extends StatelessWidget {
  const _CreateOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(icon, color: AppColors.brand),
      title: Text(label, style: AppTextStyles.body1),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: AppColors.textTertiary(theme.brightness),
      ),
      onTap: onTap,
    );
  }
}

class _RequestTab extends ConsumerWidget {
  const _RequestTab({required this.status});

  final WorkflowRequestStatus? status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = status == null
        ? ref.watch(workflowRequestsProvider)
        : ref.watch(workflowRequestsByStatusProvider(status));

    return requestsAsync.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) => ErrorState(
        onRetry: () {
          if (status == null) {
            ref.invalidate(workflowRequestsProvider);
          } else {
            ref.invalidate(workflowRequestsByStatusProvider(status));
          }
        },
      ),
      data: (requests) {
        if (requests.isEmpty) {
          return EmptyState(
            icon: Icon(
              Icons.description_outlined,
              size: 48,
              color: AppColors.textTertiary(Theme.of(context).brightness),
            ),
            title: '申請はありません',
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          itemCount: requests.length,
          itemBuilder: (context, index) =>
              _RequestCard(request: requests[index]),
        );
      },
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.request});

  final WorkflowRequest request;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('yyyy/MM/dd');

    return CommonCard(
      onTap: () => context.push(AppRoutes.workflowDetail, extra: request),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.brand.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppSpacing.sm),
            ),
            child: Icon(
              _typeIcon(request.requestType),
              color: AppColors.brand,
              size: 20,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      request.requestType.label,
                      style: AppTextStyles.body2.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    _StatusBadge(status: request.status),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  request.summary,
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (request.createdAt != null)
            Text(
              dateFormat.format(request.createdAt!),
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textTertiary(theme.brightness),
              ),
            ),
        ],
      ),
    );
  }

  IconData _typeIcon(WorkflowRequestType type) {
    switch (type) {
      case WorkflowRequestType.paidLeave:
        return Icons.beach_access_rounded;
      case WorkflowRequestType.overtime:
        return Icons.schedule_rounded;
      case WorkflowRequestType.businessTrip:
        return Icons.flight_rounded;
      case WorkflowRequestType.expense:
        return Icons.receipt_long_rounded;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final WorkflowRequestStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppSpacing.xs),
      ),
      child: Text(
        status.label,
        style: AppTextStyles.caption2.copyWith(
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _statusColor(WorkflowRequestStatus status) {
    switch (status) {
      case WorkflowRequestStatus.pending:
        return AppColors.warning;
      case WorkflowRequestStatus.approved:
        return AppColors.success;
      case WorkflowRequestStatus.rejected:
        return AppColors.error;
      case WorkflowRequestStatus.cancelled:
        return AppColors.lightTextTertiary;
    }
  }
}
