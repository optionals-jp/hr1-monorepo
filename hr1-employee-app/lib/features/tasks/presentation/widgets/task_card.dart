import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

class TaskCard extends StatelessWidget {
  const TaskCard({
    super.key,
    required this.task,
    this.onTap,
    this.onToggleDone,
    this.forceChecked = false,
  });

  final TaskItem task;
  final VoidCallback? onTap;
  final VoidCallback? onToggleDone;

  /// 完了予約中の表示を強制する（チェック済み + 打ち消し線）。
  /// 実際のステータスは未完了のままでも、このフラグが true ならチェック済みに
  /// 見せる。タスク確定までのグレース期間を視覚化するために使う。
  final bool forceChecked;

  @override
  Widget build(BuildContext context) {
    final isDone = task.status == TaskStatus.done || forceChecked;
    return CommonCard(
      margin: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        0,
        AppSpacing.screenHorizontal,
        6,
      ),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onToggleDone,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(2),
              child: CommonCheckCircle(done: isDone),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(child: _body(context, isDone)),
        ],
      ),
    );
  }

  Widget _body(BuildContext context, bool isDone) {
    final labelChips = task.labels.take(3).toList();
    final hasMeta =
        task.due != null ||
        task.checklist.isNotEmpty ||
        task.subtasks.isNotEmpty ||
        task.relations.isNotEmpty ||
        task.commentCount > 0;
    // チケット ID とタイトルは同じテキストスタイル（headline）で揃える。
    // 完了済みは半透明 + 打ち消し線を両方に適用。
    final titleStyle = AppTextStyles.headline.copyWith(
      color: isDone
          ? AppColors.textPrimary(context).withValues(alpha: 0.5)
          : AppColors.textPrimary(context),
      decoration: isDone ? TextDecoration.lineThrough : null,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Row 1: チケット ID + タイトル + 担当者アバター
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text('#${task.seq}', style: titleStyle),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                task.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: titleStyle,
              ),
            ),
            const SizedBox(width: 8),
            UserAvatar(
              initial: task.owner.avatar,
              color: Color(task.owner.argb),
              size: 22,
            ),
          ],
        ),
        // Row 2: Priority + Source チップ
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 4,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            PriorityChip(priority: task.priority),
            SourceChip(source: task.source),
          ],
        ),
        if (labelChips.isNotEmpty) ...[
          const SizedBox(height: 6),
          Wrap(
            spacing: 4,
            runSpacing: 3,
            children: [
              for (final l in labelChips)
                CommonLabel(
                  text: l,
                  color: taskLabelColor(context, l),
                  variant: CommonLabelVariant.filled,
                  dense: true,
                ),
            ],
          ),
        ],
        if (task.relatedName != null) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                Icons.link_rounded,
                size: 12,
                color: AppColors.textTertiary(context),
              ),
              const SizedBox(width: 3),
              Expanded(
                child: Text(
                  task.relatedName!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
              ),
            ],
          ),
        ],
        // メタ情報は項目があるときだけ描画（空白を作らないため）。
        if (hasMeta) ...[const SizedBox(height: 8), _MetaRow(task: task)],
      ],
    );
  }
}

class _MetaRow extends ConsumerWidget {
  const _MetaRow({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meta = <Widget>[];
    if (task.due != null) {
      meta.add(
        CommonDueBadge.fromIso(task.due, today: ref.watch(taskTodayProvider)),
      );
    }
    if (task.checklist.isNotEmpty) {
      final done = task.checklist.where((c) => c.done).length;
      meta.add(_miniText(context, '☐ $done/${task.checklist.length}'));
    }
    if (task.subtasks.isNotEmpty) {
      meta.add(_miniText(context, '⎘ ${task.subtasks.length}'));
    }
    if (task.relations.isNotEmpty) {
      meta.add(_miniText(context, '⇄ ${task.relations.length}'));
    }
    if (task.commentCount > 0) {
      meta.add(_miniText(context, '💬 ${task.commentCount}'));
    }
    return Wrap(
      spacing: 10,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: meta,
    );
  }

  Widget _miniText(BuildContext context, String text) => Text(
    text,
    style: AppTextStyles.caption2.copyWith(
      fontWeight: FontWeight.w600,
      color: AppColors.textSecondary(context),
    ),
  );
}
