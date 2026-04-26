import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';

class _HomeTaskItem {
  const _HomeTaskItem({
    required this.id,
    required this.title,
    required this.priority,
    required this.priorityColor,
    required this.due,
    required this.source,
    required this.dotColor,
  });

  final String id;
  final String title;
  final String priority;
  final Color priorityColor;
  final String due;
  final String source;
  final Color dotColor;
}

const _tasks = <_HomeTaskItem>[
  _HomeTaskItem(
    id: '#101',
    title: 'ノース電機 提案書 v4 レビュー',
    priority: '高',
    priorityColor: AppColors.warning,
    due: '今日 15:00',
    source: 'CRM',
    dotColor: AppColors.brand,
  ),
  _HomeTaskItem(
    id: '#208',
    title: 'iOS Safari で添付PDFが開けない',
    priority: '緊急',
    priorityColor: AppColors.error,
    due: '今日',
    source: '開発',
    dotColor: AppColors.brand,
  ),
  _HomeTaskItem(
    id: '#104',
    title: '鈴木さんの勤怠修正を承認',
    priority: '高',
    priorityColor: AppColors.warning,
    due: '今日中',
    source: '承認',
    dotColor: AppColors.brand,
  ),
];

const _totalCount = 4;

/// ホーム画面の「今日のタスク」セクション。
class HomeTodayTasks extends StatelessWidget {
  const HomeTodayTasks({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: AppSpacing.xl),
          _SectionHeaderRow(
            title: '今日のタスク',
            actionLabel: '$_totalCount件',
            onAction: () => context.push(AppRoutes.tasks),
          ),
          const SizedBox(height: AppSpacing.sm),
          CommonCard(
            padding: EdgeInsets.zero,
            margin: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Column(
              children: [
                for (var i = 0; i < _tasks.length; i++) ...[
                  _TaskRow(task: _tasks[i]),
                  if (i < _tasks.length - 1)
                    Divider(
                      height: 1,
                      thickness: 0.5,
                      indent: AppSpacing.md,
                      endIndent: AppSpacing.md,
                      color: AppColors.divider(context),
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

class _SectionHeaderRow extends StatelessWidget {
  const _SectionHeaderRow({
    required this.title,
    required this.actionLabel,
    required this.onAction,
  });

  final String title;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
            ),
          ),
          GestureDetector(
            onTap: onAction,
            child: Row(
              children: [
                Text(
                  actionLabel,
                  style: AppTextStyles.caption1.copyWith(
                    color: AppColors.brand,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                AppIcons.arrow(size: 16, color: AppColors.brand),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({required this.task});

  final _HomeTaskItem task;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            Icons.check_box_outline_blank_rounded,
            size: 18,
            color: AppColors.textTertiary(context),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      task.id,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textTertiary(context),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        task.title,
                        style: AppTextStyles.body2.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _PriorityBadge(
                      label: task.priority,
                      color: task.priorityColor,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${task.due}・${task.source}',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: task.dotColor,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  const _PriorityBadge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption2.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
