import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_relation_link_sheet.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 関連タスク一覧ブロック。CTA「+ 紐付け」、行タップで遷移、× で解除 + Undo。
class TaskRelationsBlock extends ConsumerWidget {
  const TaskRelationsBlock({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // bundle から関連先タスクを sync ルックアップ。
    final bundle = ref.watch(taskDetailBundleProvider(task.id)).valueOrNull;
    final raw = <(TaskRelation, TaskItem)>[];
    for (final r in task.relations) {
      final target = bundle?[r.id];
      if (target != null) raw.add((r, target));
    }
    final rels = [
      for (final k in TaskMeta.relationKindOrder)
        ...raw.where((p) => p.$1.kind == k),
    ];

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
            '関連タスク · ${rels.length}',
            prominent: true,
            trailing: InkWell(
              onTap: () => TaskRelationLinkSheet.show(context, ref, task: task),
              borderRadius: BorderRadius.circular(4),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xs,
                  vertical: 2,
                ),
                child: Text(
                  '+ 紐付け',
                  style: AppTextStyles.label1.copyWith(color: AppColors.brand),
                ),
              ),
            ),
          ),
          CommonCard(
            margin: EdgeInsets.zero,
            child: rels.isEmpty
                ? Text(
                    '関連タスクはまだありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textTertiary(context),
                    ),
                  )
                : Column(
                    children: [
                      for (int i = 0; i < rels.length; i++) ...[
                        if (i > 0)
                          Divider(height: 1, color: AppColors.border(context)),
                        _RelationRow(
                          task: task,
                          rel: rels[i].$1,
                          target: rels[i].$2,
                        ),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _RelationRow extends ConsumerWidget {
  const _RelationRow({
    required this.task,
    required this.rel,
    required this.target,
  });

  final TaskItem task;
  final TaskRelation rel;
  final TaskItem target;

  Future<void> _handleRemove(BuildContext context, WidgetRef ref) async {
    final controller = ref.read(
      taskItemDetailControllerProvider(task.id).notifier,
    );
    final messenger = ScaffoldMessenger.of(context);
    try {
      await controller.removeRelation(target.id);
    } catch (_) {
      if (!context.mounted) return;
      CommonSnackBar.error(context, '紐付けの解除に失敗しました');
      return;
    }
    if (!context.mounted) return;
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('紐付けを解除しました'),
          duration: const Duration(seconds: 3),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: '元に戻す',
            onPressed: () async {
              try {
                await controller.addRelation(rel);
              } catch (_) {
                messenger
                  ..hideCurrentSnackBar()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('紐付けの復元に失敗しました'),
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
    final color = taskRelationColor(context, rel.kind);
    return InkWell(
      onTap: () => context.push(AppRoutes.taskDetail, extra: target.id),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
        child: Row(
          children: [
            Container(
              width: 90,
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                TaskMeta.relationLabel(rel.kind),
                style: AppTextStyles.caption2.copyWith(
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                  color: color,
                ),
              ),
            ),
            const SizedBox(width: 8),
            TaskIdText(id: '#${target.seq}'),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                target.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.body2.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary(context),
                ),
              ),
            ),
            const SizedBox(width: 6),
            StatusChip(status: target.status, dense: true),
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 18),
              color: AppColors.textTertiary(context),
              tooltip: '紐付けを解除',
              visualDensity: VisualDensity.compact,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              onPressed: () => _handleRemove(context, ref),
            ),
          ],
        ),
      ),
    );
  }
}
