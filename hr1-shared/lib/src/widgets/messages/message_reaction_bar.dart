import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// メッセージリアクションバー
///
/// 各絵文字ごとのチップを並べて表示。自分がリアクション済みの絵文字は
/// ブランドカラーのハイライトで表示する。タップでトグル、`onAddReaction`
/// が指定された場合は末尾に + アイコンを表示し、呼び出し側で絵文字ピッカーを開く。
class MessageReactionBar extends StatelessWidget {
  const MessageReactionBar({
    super.key,
    required this.reactions,
    required this.currentUserId,
    required this.onToggle,
    this.onAddReaction,
  });

  final List<MessageReactionSummary> reactions;
  final String currentUserId;
  final void Function(String emoji) onToggle;
  final VoidCallback? onAddReaction;

  @override
  Widget build(BuildContext context) {
    if (reactions.isEmpty && onAddReaction == null) {
      return const SizedBox.shrink();
    }

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        ...reactions.map(
          (r) => _ReactionChip(
            emoji: r.emoji,
            count: r.count,
            reactedBySelf: r.reactedBy(currentUserId),
            onTap: () => onToggle(r.emoji),
          ),
        ),
        if (onAddReaction != null) _AddReactionChip(onTap: onAddReaction!),
      ],
    );
  }
}

class _ReactionChip extends StatelessWidget {
  const _ReactionChip({
    required this.emoji,
    required this.count,
    required this.reactedBySelf,
    required this.onTap,
  });

  final String emoji;
  final int count;
  final bool reactedBySelf;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bgColor = reactedBySelf
        ? AppColors.brandTintBgLight
        : AppColors.surfaceTertiary(context);
    final fgColor = reactedBySelf
        ? AppColors.brandTintFgLight
        : AppColors.textSecondary(context);
    final borderColor = reactedBySelf
        ? AppColors.brand
        : AppColors.border(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.cornerRadiusCircular),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(AppRadius.cornerRadiusCircular),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(emoji, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 4),
              Text(
                '$count',
                style: AppTextStyles.caption2.copyWith(
                  color: fgColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AddReactionChip extends StatelessWidget {
  const _AddReactionChip({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.cornerRadiusCircular),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.surfaceTertiary(context),
            borderRadius: BorderRadius.circular(AppRadius.cornerRadiusCircular),
            border: Border.all(color: AppColors.border(context)),
          ),
          child: Icon(
            Icons.add_reaction_outlined,
            size: 16,
            color: AppColors.textSecondary(context),
          ),
        ),
      ),
    );
  }
}
