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
    // showDatePicker の await 後に context を使うと analyzer が警告するため
    // messenger / controller を先に取得しておく。
    final messenger = ScaffoldMessenger.of(context);
    final controller = ref.read(
      taskItemDetailControllerProvider(task.id).notifier,
    );
    final initial = _parseIso(task.due) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked == null) return;
    final iso = _formatIso(picked);
    if (iso == task.due) return;
    try {
      await controller.updateDue(due: iso);
    } catch (_) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('期限の更新に失敗しました'),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      return;
    }
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('期限を更新しました'),
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Future<void> _clear(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(
      taskItemDetailControllerProvider(task.id).notifier,
    );
    final messenger = ScaffoldMessenger.of(context);
    final originalDue = task.due;
    try {
      await controller.updateDue(due: null);
    } catch (_) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '期限の解除に失敗しました');
      return;
    }
    if (!context.mounted) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('期限を解除しました'),
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: '元に戻す',
            onPressed: () async {
              try {
                await controller.updateDue(due: originalDue);
              } catch (_) {
                messenger
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('期限の復元に失敗しました'),
                      duration: Duration(seconds: 3),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
              }
            },
          ),
        ),
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

  static DateTime? _parseIso(String? iso) {
    if (iso == null || iso.length < 10) return null;
    return DateTime.tryParse(iso);
  }

  static String _formatIso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

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
