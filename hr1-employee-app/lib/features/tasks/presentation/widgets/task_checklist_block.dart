import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// チェックリストブロック。完了率の進捗バーと項目をタップ可能なリストで表示。
class TaskChecklistBlock extends ConsumerWidget {
  const TaskChecklistBlock({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = task.checklist;
    if (items.isEmpty) return const SizedBox.shrink();
    final doneCount = items.where((c) => c.done).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        16,
        AppSpacing.screenHorizontal,
        4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            'チェックリスト',
            trailing: Text(
              '$doneCount/${items.length}',
              style: AppTextStyles.caption2.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.brand,
              ),
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(2),
            child: LinearProgressIndicator(
              value: items.isEmpty ? 0 : doneCount / items.length,
              minHeight: 4,
              backgroundColor: AppColors.border(context),
              valueColor: const AlwaysStoppedAnimation(AppColors.brand),
            ),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface(context),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: AppColors.border(context)),
            ),
            child: Column(
              children: [
                for (int i = 0; i < items.length; i++) ...[
                  if (i > 0)
                    Divider(height: 1, color: AppColors.border(context)),
                  _ChecklistRow(
                    item: items[i],
                    onToggle: () => ref
                        .read(
                          taskItemDetailControllerProvider(task.id).notifier,
                        )
                        .toggleChecklistItem(items[i].id),
                  ),
                ],
                Divider(height: 1, color: AppColors.border(context)),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  child: Text(
                    '+ 項目を追加',
                    style: AppTextStyles.caption2.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.brand,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  const _ChecklistRow({required this.item, required this.onToggle});

  final TaskChecklistItem item;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final done = item.done;
    return InkWell(
      onTap: onToggle,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            CommonCheckCircle(done: done, color: AppColors.brand, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                item.label,
                style: AppTextStyles.body2.copyWith(
                  color: done
                      ? AppColors.textPrimary(context).withValues(alpha: 0.55)
                      : AppColors.textPrimary(context),
                  decoration: done ? TextDecoration.lineThrough : null,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
