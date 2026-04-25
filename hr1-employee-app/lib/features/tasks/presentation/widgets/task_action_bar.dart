import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_comment_add_sheet.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// タスク詳細画面の下部固定アクションバー。
/// 左: コメント（[TaskCommentAddSheet] を開く）、右: ステータス変更（完了切替）。
class TaskActionBar extends ConsumerWidget {
  const TaskActionBar({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDone = task.status == TaskStatus.done;
    final primaryLabel = isDone ? '未完了に戻す' : '完了にする';

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: AppSpacing.sm,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              flex: 1,
              child: CommonButton.outline(
                onPressed: () =>
                    TaskCommentAddSheet.show(context, ref, task: task),
                child: const Text('コメント'),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              flex: 2,
              child: CommonButton(
                onPressed: () {
                  final next = isDone ? TaskStatus.todo : TaskStatus.done;
                  ref
                      .read(taskItemDetailControllerProvider(task.id).notifier)
                      .updateStatus(next);
                },
                child: Text(primaryLabel),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
