import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_assignee_edit_sheet.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_due_chip.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 担当者の表示＋編集導線。タップでアサイニーピッカーを開く。
/// 氏名は `label1` (15pt semibold) で表示する。
/// 高さは [TaskDueChip.chipHeight] と共有して期限チップと揃える。
class TaskAssigneeChip extends ConsumerWidget {
  const TaskAssigneeChip({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignee = task.assignee;
    return SizedBox(
      height: TaskDueChip.chipHeight,
      child: InkWell(
        onTap: () => TaskAssigneeEditSheet.show(context, ref, task: task),
        borderRadius: BorderRadius.circular(4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (assignee != null) ...[
                UserAvatar(
                  initial: assignee.avatar,
                  color: Color(assignee.argb),
                  size: 20,
                ),
                const SizedBox(width: 6),
                Text(
                  assignee.name,
                  style: AppTextStyles.label1.copyWith(
                    color: AppColors.textPrimary(context),
                  ),
                ),
              ] else
                Text(
                  '+ 担当者を追加',
                  style: AppTextStyles.label1.copyWith(color: AppColors.brand),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
