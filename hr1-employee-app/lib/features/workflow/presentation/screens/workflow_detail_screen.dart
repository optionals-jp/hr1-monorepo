import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/controllers/workflow_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:intl/intl.dart';

/// ワークフロー申請詳細画面
class WorkflowDetailScreen extends ConsumerWidget {
  const WorkflowDetailScreen({super.key, required this.request});

  final WorkflowRequest request;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isSubmitting = ref.watch(workflowControllerProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: Text(request.requestType.label, style: AppTextStyles.headline),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          // ヘッダー: 種別 + ステータス
          Row(
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
              Text(request.requestType.label, style: AppTextStyles.headline),
              const Spacer(),
              _StatusBadge(status: request.status),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          Divider(color: AppColors.divider(theme.brightness)),
          const SizedBox(height: AppSpacing.lg),

          // 種別ごとの詳細
          ..._buildDetailRows(theme),
          const SizedBox(height: AppSpacing.lg),
          Divider(color: AppColors.divider(theme.brightness)),
          const SizedBox(height: AppSpacing.lg),

          // 申請理由
          Text(
            '申請理由',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(theme.brightness),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(request.reason, style: AppTextStyles.body1),

          // レビュー情報
          if (request.reviewedAt != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Divider(color: AppColors.divider(theme.brightness)),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'レビュー',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            DetailRow(
              label: 'レビュー日',
              value: DateFormat('yyyy/MM/dd HH:mm').format(request.reviewedAt!),
            ),
            if (request.reviewComment != null &&
                request.reviewComment!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'コメント',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(request.reviewComment!, style: AppTextStyles.body1),
            ],
          ],

          // 申請日時
          if (request.createdAt != null) ...[
            const SizedBox(height: AppSpacing.lg),
            Divider(color: AppColors.divider(theme.brightness)),
            const SizedBox(height: AppSpacing.lg),
            DetailRow(
              label: '申請日時',
              value: DateFormat('yyyy/MM/dd HH:mm').format(request.createdAt!),
            ),
          ],
        ],
      ),
      bottomNavigationBar: request.status == WorkflowRequestStatus.pending
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenHorizontal,
                  AppSpacing.sm,
                  AppSpacing.screenHorizontal,
                  AppSpacing.md,
                ),
                child: CommonButton.outline(
                  onPressed: () => _cancel(context, ref),
                  loading: isSubmitting,
                  child: const Text('申請を取消'),
                ),
              ),
            )
          : null,
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    final success = await ref
        .read(workflowControllerProvider.notifier)
        .cancel(request.id);

    if (!context.mounted) return;
    if (success) {
      CommonSnackBar.show(context, '申請を取り消しました');
      Navigator.pop(context);
    } else {
      CommonSnackBar.error(context, '取消に失敗しました');
    }
  }

  List<Widget> _buildDetailRows(ThemeData theme) {
    switch (request.requestType) {
      case WorkflowRequestType.paidLeave:
        return [
          if (request.leaveType != null)
            DetailRow(
              label: '休暇種別',
              value: LeaveType.fromString(request.leaveType!).label,
            ),
          if (request.startDate != null)
            DetailRow(label: '開始日', value: request.startDate!),
          if (request.endDate != null && request.endDate != request.startDate)
            DetailRow(label: '終了日', value: request.endDate!),
          if (request.leaveDays != null)
            DetailRow(label: '日数', value: '${request.leaveDays}日'),
        ];
      case WorkflowRequestType.overtime:
        return [
          if (request.overtimeDate != null)
            DetailRow(label: '日付', value: request.overtimeDate!),
          if (request.estimatedHours != null)
            DetailRow(label: '予定時間', value: '${request.estimatedHours}時間'),
          if (request.requestData['task_description'] != null)
            DetailRow(
              label: '作業内容',
              value: request.requestData['task_description'] as String,
            ),
        ];
      case WorkflowRequestType.businessTrip:
        return [
          if (request.destination != null)
            DetailRow(label: '行先', value: request.destination!),
          if (request.startDate != null)
            DetailRow(label: '開始日', value: request.startDate!),
          if (request.endDate != null)
            DetailRow(label: '終了日', value: request.endDate!),
          if (request.purpose != null)
            DetailRow(label: '目的', value: request.purpose!),
        ];
      case WorkflowRequestType.expense:
        return [
          if (request.expenseCategory != null)
            DetailRow(label: 'カテゴリ', value: request.expenseCategory!),
          if (request.expenseAmount != null)
            DetailRow(label: '金額', value: '¥${request.expenseAmount}'),
          if (request.requestData['description'] != null)
            DetailRow(
              label: '説明',
              value: request.requestData['description'] as String,
            ),
        ];
    }
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
