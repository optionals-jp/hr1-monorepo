import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_shared/hr1_shared.dart';

import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_action.dart';
import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_message.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/controllers/ai_chat_controller.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/widgets/ai_message_bubble.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/widgets/ai_typing_indicator.dart';

/// AIアシスタント会話画面（フルスクリーン）。
///
/// 既存 `ThreadChatScreen` の `HookConsumerWidget` + `flutter_hooks` パターンに
/// 揃える。`useTextEditingController` / `useScrollController` は hook が dispose
/// 管理する。
class AiChatScreen extends HookConsumerWidget {
  const AiChatScreen({super.key, this.initialMessage});

  /// `_PromptChip` 等からの prefill 文字列。**入力欄に prefill するだけ**で
  /// 自動送信はしない（取り消し可能性 / 二重送信回避）。
  final String? initialMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final inputController = useTextEditingController(text: initialMessage);
    final scrollController = useScrollController();
    final state = ref.watch(aiChatControllerProvider);

    // メッセージリストが伸びたら末尾にスクロール。
    ref.listen<int>(aiChatControllerProvider.select((s) => s.messages.length), (
      prev,
      next,
    ) {
      if (next > (prev ?? 0)) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (scrollController.hasClients) {
            scrollController.animateTo(
              scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
            );
          }
        });
      }
    });

    // typing 開始時もスクロール（タイピング表示が画面下にあるため）。
    ref.listen<bool>(
      aiChatControllerProvider.select((s) => s.isAssistantTyping),
      (prev, next) {
        if (next == true && prev != true) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (scrollController.hasClients) {
              scrollController.animateTo(
                scrollController.position.maxScrollExtent,
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
              );
            }
          });
        }
      },
    );

    // エラー通知（独自イベント Provider 経由で 1 回限り）。
    ref.listen<int>(aiChatErrorEventProvider, (prev, next) {
      if (next != 0 && next != prev) {
        CommonSnackBar.error(context, 'AIアシスタントとの通信に失敗しました');
      }
    });

    void send(String text) {
      if (text.trim().isEmpty) return;
      inputController.clear();
      ref.read(aiChatControllerProvider.notifier).sendMessage(text);
    }

    void dispatchAction(AiAction action) {
      switch (action.actionType) {
        case AiActionType.navigateAttendance:
          context.push(AppRoutes.attendance);
        case AiActionType.navigateLeaveBalance:
          context.push(AppRoutes.leaveBalance);
        case AiActionType.openWorkflowCreate:
          final type = action.payload['type'] as WorkflowRequestType?;
          context.push(AppRoutes.workflowCreate, extra: type);
        case AiActionType.openCrmCompany:
          // 仮データのため CRM 一覧画面へ。本実装では companyId で詳細遷移。
          context.push(AppRoutes.bcCompanies);
        case AiActionType.openWiki:
          context.push(AppRoutes.wiki);
        case AiActionType.prefillMessage:
          final text = action.payload['text'] as String?;
          if (text != null) inputController.text = text;
      }
    }

    Future<void> copyText(String text) async {
      await Clipboard.setData(ClipboardData(text: text));
      if (!context.mounted) return;
      CommonSnackBar.show(context, 'コピーしました');
    }

    void regenerate(String assistantMessageId) {
      ref
          .read(aiChatControllerProvider.notifier)
          .regenerateLastResponse(assistantMessageId);
    }

    void onFeedback(String messageId, AiFeedback fb) {
      ref.read(aiChatControllerProvider.notifier).toggleFeedback(messageId, fb);
    }

    return CommonScaffold(
      appBar: _AiChatAppBar(
        onClearPressed: () =>
            ref.read(aiChatControllerProvider.notifier).clearConversation(),
      ),
      // bottomNavigationBar は keyboard で隠れるため、body の Column 末尾に
      // 入力バーを置いて Scaffold の resizeToAvoidBottomInset に追従させる。
      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Expanded(
                child: _MessageList(
                  messages: state.messages,
                  feedbacks: state.feedbacks,
                  isAssistantTyping: state.isAssistantTyping,
                  scrollController: scrollController,
                  onActionPressed: dispatchAction,
                  onCopy: copyText,
                  onRegenerate: regenerate,
                  onFeedback: onFeedback,
                ),
              ),
              MessageInputBar(
                controller: inputController,
                isSending: state.isAssistantTyping,
                hintText: 'メッセージを入力...',
                onSend: () => send(inputController.text),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AiChatAppBar extends StatelessWidget implements PreferredSizeWidget {
  const _AiChatAppBar({required this.onClearPressed});

  final VoidCallback onClearPressed;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.surface(context),
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: Icon(
          Icons.arrow_back_ios_new,
          color: AppColors.textPrimary(context),
        ),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      titleSpacing: 0,
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppColors.brand,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: AppIcons.starFill(size: 18, color: Colors.white),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'AI アシスタント',
                  style: AppTextStyles.body1.copyWith(
                    color: AppColors.textPrimary(context),
                    fontWeight: FontWeight.w700,
                  ),
                ),
                Text(
                  'いつでも話しかけてください',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: AppIcons.clock(size: 22, color: AppColors.textPrimary(context)),
          tooltip: '履歴',
          onPressed: () {
            // 履歴画面は将来的に追加。本フェーズでは未実装。
            CommonSnackBar.show(context, '会話履歴は近日提供予定です');
          },
        ),
        IconButton(
          icon: AppIcons.messageAdd(
            size: 22,
            color: AppColors.textPrimary(context),
          ),
          tooltip: '新規会話',
          onPressed: onClearPressed,
        ),
      ],
    );
  }
}

class _MessageList extends StatelessWidget {
  const _MessageList({
    required this.messages,
    required this.feedbacks,
    required this.isAssistantTyping,
    required this.scrollController,
    required this.onActionPressed,
    required this.onCopy,
    required this.onRegenerate,
    required this.onFeedback,
  });

  final List<AiMessage> messages;
  final Map<String, AiFeedback> feedbacks;
  final bool isAssistantTyping;
  final ScrollController scrollController;
  final void Function(AiAction) onActionPressed;
  final void Function(String text) onCopy;
  final void Function(String assistantMessageId) onRegenerate;
  final void Function(String assistantMessageId, AiFeedback) onFeedback;

  @override
  Widget build(BuildContext context) {
    if (messages.isEmpty && !isAssistantTyping) {
      return const _EmptyState();
    }
    // メッセージ + (typing 中なら) インジケーター + (先頭の) 日付ピル。
    final itemCount = messages.length + 1 + (isAssistantTyping ? 1 : 0);
    return ListView.builder(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.screenHorizontal,
        AppSpacing.md,
      ),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        if (index == 0) return const _DateSeparator(label: '今日');
        final messageIndex = index - 1;
        if (messageIndex < messages.length) {
          final msg = messages[messageIndex];
          // メタアクションは AI 応答にのみ付与。
          if (msg is AiAssistantMessage) {
            return AiMessageBubble(
              message: msg,
              onActionPressed: onActionPressed,
              feedback: feedbacks[msg.id] ?? AiFeedback.none,
              onCopy: () => onCopy(msg.text),
              onRegenerate: () => onRegenerate(msg.id),
              onFeedback: (fb) => onFeedback(msg.id, fb),
            );
          }
          return AiMessageBubble(
            message: msg,
            onActionPressed: onActionPressed,
          );
        }
        return const AiTypingIndicator();
      },
    );
  }
}

class _DateSeparator extends StatelessWidget {
  const _DateSeparator({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.surfaceTertiary(context),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            label,
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.brand,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: AppIcons.starFill(size: 32, color: Colors.white),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'AI アシスタント',
              style: AppTextStyles.title2.copyWith(
                color: AppColors.textPrimary(context),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '勤怠・申請・取引先のことなど、なんでも聞いてみてください',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(context),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
