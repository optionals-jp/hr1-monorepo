import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 期限の表示＋編集導線。タップで `showDatePicker`、× で解除。
/// 期限テキストは `label1` (15pt semibold) で他の小さなメタデータより目立たせる。
///
/// チップ全体の固定高さ (`chipHeight = 24`) は [TaskAssigneeChip] と共有。
/// これにより担当者あり/なし・期限あり/なしの全組み合わせで高さが揃う。
class TaskDueChip extends ConsumerWidget {
  const TaskDueChip({super.key, required this.task});

  final TaskItem task;

  /// `TaskAssigneeChip` と共有する固定高さ。
  static const double chipHeight = 24;

  Future<void> _pickDate(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(
      taskItemDetailControllerProvider(task.id).notifier,
    );
    final initial = TaskMeta.parseIso(task.due) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    final iso = TaskMeta.formatIso(picked);
    if (iso == task.due) return;
    try {
      await controller.updateDue(due: iso);
    } catch (_) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '期限の更新に失敗しました');
      return;
    }
    if (!context.mounted) return;
    CommonSnackBar.show(context, '期限を更新しました');
  }

  Future<void> _clear(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(
      taskItemDetailControllerProvider(task.id).notifier,
    );
    final originalDue = task.due;
    try {
      await controller.updateDue(due: null);
    } catch (_) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '期限の解除に失敗しました');
      return;
    }
    if (!context.mounted) return;
    CommonSnackBar.show(
      context,
      '期限を解除しました',
      actionLabel: '元に戻す',
      onAction: () async {
        try {
          await controller.updateDue(due: originalDue);
        } catch (_) {
          if (!context.mounted) return;
          CommonSnackBar.error(context, '期限の復元に失敗しました');
        }
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = ref.watch(taskTodayProvider);
    final hasDue = task.due != null;
    return SizedBox(
      height: chipHeight,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          InkWell(
            onTap: () => _pickDate(context, ref),
            borderRadius: BorderRadius.circular(4),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
              child: Text(
                hasDue ? _formatDisplay(task.due!) : '+ 期限を追加',
                style: AppTextStyles.label1.copyWith(
                  color: hasDue
                      ? _dueColor(context, task.due, today)
                      : AppColors.brand,
                ),
              ),
            ),
          ),
          if (hasDue)
            SizedBox(
              width: chipHeight,
              height: chipHeight,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, size: 16),
                color: AppColors.textTertiary(context),
                tooltip: '期限を解除',
                padding: EdgeInsets.zero,
                onPressed: () => _clear(context, ref),
              ),
            ),
        ],
      ),
    );
  }

  /// ISO 日付 (yyyy-MM-dd) を表示用 MM/dd に整形する。
  static String _formatDisplay(String iso) {
    final parts = iso.split('-');
    if (parts.length == 3) return '${parts[1]}/${parts[2]}';
    return iso;
  }

  static Color _dueColor(BuildContext context, String? due, DateTime today) {
    final iso = TaskMeta.parseIso(due);
    if (iso == null) return AppColors.textPrimary(context);
    if (iso.isBefore(today)) return AppColors.danger;
    if (iso.isAtSameMomentAs(today)) return AppColors.brand;
    return AppColors.textPrimary(context);
  }
}
