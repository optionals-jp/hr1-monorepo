import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// メッセージバブル
///
/// - 自分の発言は右寄せ (brand 背景 / 白文字)、相手の発言は左寄せ (surfaceTertiary)
/// - 削除されたメッセージはプレースホルダを表示
/// - 本文のメンショントークン `@[name](uuid)` は `@name` として表示し、
///   メンション部分は太字に。自分がメンションされている場合は黄色ハイライト帯を付ける
/// - 添付・リアクション・返信件数は子ウィジェットとして差し込む
class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.content,
    required this.isSelf,
    required this.isDeleted,
    this.isFirstInGroup = true,
    this.isLastInGroup = true,
    this.senderName,
    this.createdAtLabel,
    this.isEdited = false,
    this.mentionsCurrentUser = false,
    this.attachments,
    this.reactions,
    this.footer,
    this.onLongPress,
    this.onTap,
  });

  /// 本文（mentions を含む raw 文字列）
  final String content;
  final bool isSelf;
  final bool isDeleted;
  final bool isFirstInGroup;
  final bool isLastInGroup;
  final String? senderName;
  final String? createdAtLabel;
  final bool isEdited;

  /// 自分がメンションされている場合に左に黄色のバーを表示する
  final bool mentionsCurrentUser;

  /// 添付プレビュー（画像・ファイルカード等）
  final Widget? attachments;

  /// リアクションバー
  final Widget? reactions;

  /// 返信件数・既読インジケーター等
  final Widget? footer;

  final VoidCallback? onLongPress;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final bgColor = isDeleted
        ? AppColors.surfaceTertiary(context)
        : isSelf
        ? AppColors.brand
        : AppColors.surfaceTertiary(context);
    final textColor = isDeleted
        ? AppColors.textTertiary(context)
        : isSelf
        ? Colors.white
        : AppColors.textPrimary(context);

    final borderRadius = BorderRadius.only(
      topLeft: Radius.circular(
        !isSelf && isFirstInGroup ? 18 : (isSelf ? 18 : 6),
      ),
      topRight: Radius.circular(
        isSelf && isFirstInGroup ? 18 : (!isSelf ? 18 : 6),
      ),
      bottomLeft: Radius.circular(
        !isSelf && isLastInGroup ? 18 : (isSelf ? 18 : 6),
      ),
      bottomRight: Radius.circular(
        isSelf && isLastInGroup ? 18 : (!isSelf ? 18 : 6),
      ),
    );

    final children = <Widget>[];

    if (!isSelf && isFirstInGroup && (senderName?.isNotEmpty ?? false)) {
      children.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            senderName!,
            style: AppTextStyles.caption1.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    }

    if (attachments != null) {
      children.add(
        Padding(padding: const EdgeInsets.only(bottom: 6), child: attachments!),
      );
    }

    if (!isDeleted && content.isNotEmpty) {
      children.add(_buildContent(context, textColor));
    } else if (isDeleted) {
      children.add(
        Text(
          'このメッセージは削除されました',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textTertiary(context),
            fontStyle: FontStyle.italic,
          ),
        ),
      );
    }

    if (createdAtLabel != null || isEdited) {
      children.add(
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isEdited)
                Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: Text(
                    '(編集済み)',
                    style: AppTextStyles.caption2.copyWith(
                      color: isSelf
                          ? Colors.white.withValues(alpha: 0.8)
                          : AppColors.textTertiary(context),
                    ),
                  ),
                ),
              if (createdAtLabel != null)
                Text(
                  createdAtLabel!,
                  style: AppTextStyles.caption2.copyWith(
                    color: isSelf
                        ? Colors.white.withValues(alpha: 0.8)
                        : AppColors.textTertiary(context),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    final bubble = Container(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.of(context).size.width * 0.78,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: borderRadius,
        border: mentionsCurrentUser && !isSelf
            ? Border(left: BorderSide(color: AppColors.sunOrange, width: 3))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: children,
      ),
    );

    return GestureDetector(
      onLongPress: isDeleted ? null : onLongPress,
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        crossAxisAlignment: isSelf
            ? CrossAxisAlignment.end
            : CrossAxisAlignment.start,
        children: [
          bubble,
          if (reactions != null)
            Padding(padding: const EdgeInsets.only(top: 4), child: reactions!),
          if (footer != null)
            Padding(padding: const EdgeInsets.only(top: 2), child: footer!),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, Color textColor) {
    final segments = parseMentionTokens(content);
    if (segments.isEmpty) {
      return Text(
        content,
        style: AppTextStyles.body2.copyWith(color: textColor),
      );
    }

    final spans = <InlineSpan>[];
    for (final seg in segments) {
      if (seg.isMention) {
        spans.add(
          TextSpan(
            text: seg.text,
            style: AppTextStyles.body2.copyWith(
              color: textColor,
              fontWeight: FontWeight.w700,
            ),
          ),
        );
      } else {
        spans.add(
          TextSpan(
            text: seg.text,
            style: AppTextStyles.body2.copyWith(color: textColor),
          ),
        );
      }
    }

    return SelectableText.rich(
      TextSpan(children: spans),
      style: AppTextStyles.body2.copyWith(color: textColor),
    );
  }
}
