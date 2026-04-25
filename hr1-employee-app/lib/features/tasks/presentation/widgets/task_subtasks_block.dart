import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_subtask_add_sheet.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// サブタスク一覧ブロック。進捗バー付き、追加 CTA 付き。
class TaskSubtasksBlock extends ConsumerWidget {
  const TaskSubtasksBlock({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // bundle から sync ルックアップ。未ロード中は subtasks 表示が空。
    final bundle = ref.watch(taskDetailBundleProvider(task.id)).valueOrNull;
    final subs = <TaskItem>[
      for (final id in task.subtasks)
        if (bundle?[id] case final t?) t,
    ];
    final doneCount = subs.where((s) => s.status == TaskStatus.done).length;
    final progress = subs.isEmpty ? 0.0 : doneCount / subs.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        16,
        AppSpacing.screenHorizontal,
        4,
      ),
      child: Column(
        // 中身が短くても CommonCard を画面横幅いっぱいまで広げるため stretch。
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionHeader(
            subs.isEmpty ? 'サブタスク' : 'サブタスク · $doneCount/${subs.length}',
            prominent: true,
            trailing: InkWell(
              onTap: () => TaskSubtaskAddSheet.show(context, ref, parent: task),
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 2,
                ),
                child: Text(
                  '+ 追加',
                  style: AppTextStyles.label1.copyWith(color: AppColors.brand),
                ),
              ),
            ),
          ),
          CommonCard(
            margin: EdgeInsets.zero,
            child: subs.isEmpty
                ? Text(
                    'サブタスクはまだありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 3,
                          backgroundColor: AppColors.border(context),
                          valueColor: const AlwaysStoppedAnimation(
                            AppColors.successFilled,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      for (int i = 0; i < subs.length; i++) ...[
                        if (i > 0)
                          Divider(height: 1, color: AppColors.border(context)),
                        _SubtaskRow(task: subs[i]),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _SubtaskRow extends StatelessWidget {
  const _SubtaskRow({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    final isDone = task.status == TaskStatus.done;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          TaskIdText(id: '#${task.seq}'),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              task.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.body2.copyWith(
                fontWeight: FontWeight.w500,
                color: isDone
                    ? AppColors.textPrimary(context).withValues(alpha: 0.55)
                    : AppColors.textPrimary(context),
                decoration: isDone ? TextDecoration.lineThrough : null,
              ),
            ),
          ),
          const SizedBox(width: 6),
          StatusChip(status: task.status, dense: true),
          const SizedBox(width: 6),
          UserAvatar(
            initial: task.owner.avatar,
            color: Color(task.owner.argb),
            size: 18,
          ),
        ],
      ),
    );
  }
}
