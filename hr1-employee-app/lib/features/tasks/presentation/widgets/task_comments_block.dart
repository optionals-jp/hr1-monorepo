import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// コメント一覧ブロック。`task.comments` を表示する。
/// 1 件 1 件は SNS（Twitter / Slack 風）スタイル: 左にアバター、
/// 右に「氏名・時刻・本文」を縦並び。コメント間は薄い区切り線、空状態は
/// 「コメントはまだありません」プレースホルダ。
class TaskCommentsBlock extends StatelessWidget {
  const TaskCommentsBlock({super.key, required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    final comments = task.comments;
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
          SectionHeader('コメント · ${comments.length}', prominent: true),
          CommonCard(
            margin: EdgeInsets.zero,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: comments.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'コメントはまだありません',
                      style: AppTextStyles.body2.copyWith(
                        color: AppColors.textTertiary(context),
                      ),
                    ),
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (int i = 0; i < comments.length; i++) ...[
                        _CommentItem(comment: comments[i]),
                      ],
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

class _CommentItem extends StatelessWidget {
  const _CommentItem({required this.comment});

  final TaskComment comment;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          UserAvatar(
            initial: comment.user.avatar,
            color: Color(comment.user.argb),
            size: 36,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        comment.user.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTextStyles.body2.copyWith(
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary(context),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '·',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textTertiary(context),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _formatTime(comment.createdAt),
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textTertiary(context),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  comment.text,
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textPrimary(context),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// `M/d HH:mm` 形式のシンプル整形。intl 依存を増やさないため自前実装。
  static String _formatTime(DateTime dt) {
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '${dt.month}/${dt.day} $hh:$mm';
  }
}
