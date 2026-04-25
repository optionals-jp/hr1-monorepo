import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// タスクの担当者を選択／解除するハーフシート。
///
/// タスク一覧の担当者フィルタと統一して [CommonOptionSheet]（単一選択 + 検索）
/// を使う。タップで即時 `updateAssignee` を呼び（楽観更新）、シートを閉じる。
/// 失敗時は SnackBar でエラー表示し、controller 側のロールバックに任せる。
class TaskAssigneeEditSheet {
  TaskAssigneeEditSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem task,
  }) async {
    // 候補が未ロードのまま空リストでシートを開かないよう、まず future を await。
    final candidates = await ref.read(assigneeCandidatesProvider.future);
    if (!context.mounted) return;

    Future<void> apply(String? userId) async {
      // userId == null は「未割り当て」、それ以外は候補から検索。
      TaskUser? next;
      if (userId != null) {
        for (final u in candidates) {
          if (u.id == userId) {
            next = u;
            break;
          }
        }
      }
      try {
        await ref
            .read(taskItemDetailControllerProvider(task.id).notifier)
            .updateAssignee(next);
        if (!context.mounted) return;
        CommonSnackBar.show(context, '担当者を更新しました');
      } catch (_) {
        if (!context.mounted) return;
        CommonSnackBar.error(context, '担当者の更新に失敗しました');
      }
    }

    return CommonOptionSheet.show<String?>(
      context: context,
      title: '担当者を選択',
      searchable: true,
      searchHint: '名前で検索',
      options: [
        CommonOption<String?>(
          value: null,
          label: '未割り当て',
          leading: _UnassignedAvatar(),
          labelStyle: AppTextStyles.label1,
        ),
        for (final user in candidates)
          CommonOption<String?>(
            value: user.id,
            label: user.name,
            leading: UserAvatar(
              initial: user.avatar,
              color: Color(user.argb),
              size: 32,
            ),
            labelStyle: AppTextStyles.label1,
          ),
      ],
      selected: task.assignee?.id,
      onSelect: apply,
    );
  }
}

/// 「未割り当て」行のプレースホルダアバター。`UserAvatar` と同じ 32px の円形で
/// 行高をユーザー候補と揃える。
class _UnassignedAvatar extends StatelessWidget {
  const _UnassignedAvatar();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.border(context)),
      ),
      child: Icon(
        Icons.person_off_outlined,
        size: 16,
        color: AppColors.textTertiary(context),
      ),
    );
  }
}
