import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_assignee_chip.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_due_chip.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// タスク詳細画面のヘッダ。親タスクのパンくず・各種チップ・タイトル・
/// ラベル・期限/担当者/スプリントを 1 ブロックにまとめて表示する。
class TaskDetailHeader extends ConsumerWidget {
  const TaskDetailHeader({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 親タスクは詳細画面で先読みされる bundle から sync ルックアップ。
    // bundle 未ロード時は親パンくずを描画しない（再描画で表示される）。
    final bundle = task.parent == null
        ? null
        : ref.watch(taskDetailBundleProvider(task.id)).valueOrNull;
    final parent = task.parent == null ? null : bundle?[task.parent!];
    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        8,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (parent != null) ...[
            Row(
              children: [
                Text(
                  parent.id,
                  style: AppTextStyles.caption2.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary(context),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    parent.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ),
                Text(
                  '/',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textTertiary(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          Wrap(
            spacing: 6,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TaskIdText(id: '#${task.seq}'),
              PriorityChip(priority: task.priority),
              SourceChip(source: task.source),
              StatusChip(status: task.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            task.title,
            style: AppTextStyles.title3.copyWith(
              color: AppColors.textPrimary(context),
            ),
          ),
          if (task.labels.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              runSpacing: 4,
              children: [
                for (final l in task.labels)
                  CommonLabel(
                    text: l,
                    color: taskLabelColor(context, l),
                    variant: CommonLabelVariant.filled,
                    dense: true,
                  ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TaskDueChip(task: task),
              TaskAssigneeChip(task: task),
            ],
          ),
        ],
      ),
    );
  }
}
