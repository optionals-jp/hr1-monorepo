import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_desc_edit_sheet.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 説明セクション。空でも CTA「+ 追加」を出し、タップ／編集で
/// [TaskDescEditSheet] を開く。
class TaskDescriptionBlock extends ConsumerWidget {
  const TaskDescriptionBlock({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isEmpty = task.desc.isEmpty;
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
            '説明',
            prominent: true,
            trailing: InkWell(
              onTap: () => TaskDescEditSheet.show(context, ref, task: task),
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 2,
                ),
                child: Text(
                  isEmpty ? '+ 追加' : '編集',
                  style: AppTextStyles.label1.copyWith(color: AppColors.brand),
                ),
              ),
            ),
          ),
          CommonCard(
            margin: EdgeInsets.zero,
            onTap: () => TaskDescEditSheet.show(context, ref, task: task),
            child: isEmpty
                ? Text(
                    '説明はまだありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                  )
                : Text(
                    task.desc,
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textPrimary(context),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
