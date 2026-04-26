import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/ai_action.dart';
import '../../domain/entities/ai_card.dart';
import '../../domain/entities/ai_message.dart';
import '../controllers/ai_chat_controller.dart';
import 'ai_action_button_row.dart';
import 'ai_reference_chip.dart';
import 'client_info_card_view.dart';
import 'overtime_summary_card_view.dart';
import 'workflow_suggestion_card_view.dart';

/// 1 メッセージ分の描画。
///
/// - ユーザー発話 → 右寄せの青バブル（右下のみ角丸 4px、他 18px）
/// - AI 応答 → 左寄せのカード（左上のみ角丸 4px、他 16px）+
///   カード外下部にメタアクション（コピー/再生成/👍/👎）
///
/// 共有 [MessageBubble] は本文 body2 固定 + 横幅 78% 制約のためカードが
/// 入らない。AI チャットは独自バブルで body1 + 角丸非対称を実現する。
class AiMessageBubble extends StatelessWidget {
  const AiMessageBubble({
    super.key,
    required this.message,
    required this.onActionPressed,
    this.feedback = AiFeedback.none,
    this.onCopy,
    this.onRegenerate,
    this.onFeedback,
  });

  final AiMessage message;
  final void Function(AiAction action) onActionPressed;

  /// AI 応答に対する現在のフィードバック状態（user メッセージでは未使用）。
  final AiFeedback feedback;

  /// AI 応答用のメタアクション。null の場合は当該ボタンを描画しない。
  final VoidCallback? onCopy;
  final VoidCallback? onRegenerate;
  final void Function(AiFeedback)? onFeedback;

  @override
  Widget build(BuildContext context) {
    return switch (message) {
      final AiUserMessage m => _UserBubble(message: m),
      final AiAssistantMessage m => _AssistantBubble(
        message: m,
        onActionPressed: onActionPressed,
        feedback: feedback,
        onCopy: onCopy,
        onRegenerate: onRegenerate,
        onFeedback: onFeedback,
      ),
    };
  }
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.message});

  final AiUserMessage message;

  @override
  Widget build(BuildContext context) {
    // 共有 MessageBubble は body2 固定のため、AI チャット文脈では本文を
    // body1 で描画する独自バブルを用意する。
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Align(
        alignment: Alignment.centerRight,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.78,
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: const BoxDecoration(
                  color: AppColors.brand,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(4),
                  ),
                ),
                child: SelectableText(
                  message.text,
                  style: AppTextStyles.body1.copyWith(color: Colors.white),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('HH:mm').format(message.createdAt),
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textTertiary(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AssistantBubble extends StatelessWidget {
  const _AssistantBubble({
    required this.message,
    required this.onActionPressed,
    required this.feedback,
    required this.onCopy,
    required this.onRegenerate,
    required this.onFeedback,
  });

  final AiAssistantMessage message;
  final void Function(AiAction action) onActionPressed;
  final AiFeedback feedback;
  final VoidCallback? onCopy;
  final VoidCallback? onRegenerate;
  final void Function(AiFeedback)? onFeedback;

  @override
  Widget build(BuildContext context) {
    final hasMetaActions =
        onCopy != null || onRegenerate != null || onFeedback != null;
    return Padding(
      // 右側を 40px 開けてユーザー側の青バブルとの非対称性を視覚化する。
      padding: const EdgeInsets.fromLTRB(0, AppSpacing.sm, 20, AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'AI アシスタント',
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(context),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                DateFormat('HH:mm').format(message.createdAt),
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textTertiary(context),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          _AssistantBody(message: message, onActionPressed: onActionPressed),
          if (hasMetaActions) ...[
            const SizedBox(height: 6),
            _AssistantMetaActions(
              feedback: feedback,
              onCopy: onCopy,
              onRegenerate: onRegenerate,
              onFeedback: onFeedback,
            ),
          ],
        ],
      ),
    );
  }
}

/// AI 応答カード外側に並ぶメタアクション群（コピー / 再生成 / 👍 / 👎）。
class _AssistantMetaActions extends StatelessWidget {
  const _AssistantMetaActions({
    required this.feedback,
    required this.onCopy,
    required this.onRegenerate,
    required this.onFeedback,
  });

  final AiFeedback feedback;
  final VoidCallback? onCopy;
  final VoidCallback? onRegenerate;
  final void Function(AiFeedback)? onFeedback;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        if (onCopy != null)
          _MetaActionButton(
            icon: AppIcons.documentCopy,
            label: 'コピー',
            onTap: onCopy!,
          ),
        if (onRegenerate != null)
          _MetaActionButton(
            icon: AppIcons.refresh2,
            label: '再生成',
            onTap: onRegenerate!,
          ),
        if (onFeedback != null) ...[
          _MetaActionButton(
            icon: feedback == AiFeedback.good
                ? AppIcons.likeFill
                : AppIcons.like,
            tooltip: 'グッド',
            highlighted: feedback == AiFeedback.good,
            onTap: () => onFeedback!(AiFeedback.good),
          ),
          _MetaActionButton(
            icon: feedback == AiFeedback.bad
                ? AppIcons.dislikeFill
                : AppIcons.dislike,
            tooltip: 'バッド',
            highlighted: feedback == AiFeedback.bad,
            onTap: () => onFeedback!(AiFeedback.bad),
          ),
        ],
      ],
    );
  }
}

/// メタアクションの 1 ボタン。アイコンのみ or アイコン + ラベル。
class _MetaActionButton extends StatelessWidget {
  const _MetaActionButton({
    required this.icon,
    required this.onTap,
    this.label,
    this.tooltip,
    this.highlighted = false,
  });

  final Widget Function({double size, Color? color}) icon;
  final VoidCallback onTap;
  final String? label;
  final String? tooltip;
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final fg = highlighted ? AppColors.brand : AppColors.textSecondary(context);
    final body = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          icon(size: 16, color: fg),
          if (label != null) ...[
            const SizedBox(width: 4),
            Text(
              label!,
              style: AppTextStyles.caption1.copyWith(
                color: fg,
                fontWeight: highlighted ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ],
        ],
      ),
    );
    final tappable = InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: body,
    );
    if (tooltip != null) {
      return Tooltip(message: tooltip!, child: tappable);
    }
    return tappable;
  }
}

class _AssistantBody extends StatelessWidget {
  const _AssistantBody({required this.message, required this.onActionPressed});

  final AiAssistantMessage message;
  final void Function(AiAction action) onActionPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        // 自分の発言（右下 4px）と対をなす形で、AI 側は左上だけ 4px に。
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(4),
          topRight: Radius.circular(16),
          bottomLeft: Radius.circular(16),
          bottomRight: Radius.circular(16),
        ),
        border: Border.all(color: AppColors.border(context), width: 0.5),
        // CommonCard と同一のシャドウ。
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (message.text.isNotEmpty) ...[
            _richText(text: message.text, context: context),
            const SizedBox(height: AppSpacing.sm),
          ],
          for (final card in message.cards) ...[
            _CardSwitch(card: card),
            const SizedBox(height: AppSpacing.md),
          ],
          if (message.references.isNotEmpty) ...[
            AiReferenceList(references: message.references),
            const SizedBox(height: AppSpacing.sm),
          ],
          if (message.actions.isNotEmpty)
            AiActionButtonRow(
              actions: message.actions,
              onPressed: onActionPressed,
            ),
        ],
      ),
    );
  }

  /// 簡易 markdown bold 解釈（`**text**` のみ太字に）。
  /// 本実装で flutter_markdown へ差し替える場合は AiAssistantMessage の
  /// 形式を変えずに描画側だけ置換可能。
  Widget _richText({required String text, required BuildContext context}) {
    final spans = <TextSpan>[];
    final pattern = RegExp(r'\*\*(.+?)\*\*');
    var lastEnd = 0;
    for (final match in pattern.allMatches(text)) {
      if (match.start > lastEnd) {
        spans.add(TextSpan(text: text.substring(lastEnd, match.start)));
      }
      spans.add(
        TextSpan(
          text: match.group(1),
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      );
      lastEnd = match.end;
    }
    if (lastEnd < text.length) {
      spans.add(TextSpan(text: text.substring(lastEnd)));
    }
    return SelectableText.rich(
      TextSpan(
        children: spans,
        style: AppTextStyles.body1.copyWith(
          color: AppColors.textPrimary(context),
        ),
      ),
    );
  }
}

class _CardSwitch extends StatelessWidget {
  const _CardSwitch({required this.card});

  final AiCardData card;

  @override
  Widget build(BuildContext context) {
    return switch (card) {
      final OvertimeSummaryCardData c => OvertimeSummaryCardView(data: c),
      final ClientInfoCardData c => ClientInfoCardView(data: c),
      final WorkflowSuggestionCardData c => WorkflowSuggestionCardView(data: c),
    };
  }
}
