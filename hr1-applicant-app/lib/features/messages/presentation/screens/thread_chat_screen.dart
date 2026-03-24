import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/core/utils/date_formatter.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_applicant_app/features/messages/presentation/controllers/thread_chat_controller.dart';

class ThreadChatScreen extends HookConsumerWidget {
  const ThreadChatScreen({super.key, required this.thread});

  final MessageThread thread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = useTextEditingController();
    final scrollController = useScrollController();
    final editController = useTextEditingController();
    final editingMessageId = useState<String?>(null);

    final currentUserId = ref.read(appUserProvider)?.id ?? '';
    final controllerArg = (threadId: thread.id, currentUserId: currentUserId);

    useEffect(() {
      void onScroll() {
        if (scrollController.position.pixels >=
            scrollController.position.maxScrollExtent - 50) {
          ref
              .read(threadChatControllerProvider(controllerArg).notifier)
              .loadOlderMessages();
        }
      }

      void onTextChanged() {
        ref
            .read(threadChatControllerProvider(controllerArg).notifier)
            .onTextChanged(controller.text);
      }

      scrollController.addListener(onScroll);
      controller.addListener(onTextChanged);
      return () {
        scrollController.removeListener(onScroll);
        controller.removeListener(onTextChanged);
      };
    }, [scrollController, controller]);

    Future<void> sendMessage() async {
      final content = controller.text.trim();
      if (content.isEmpty) return;

      controller.clear();

      final success = await ref
          .read(threadChatControllerProvider(controllerArg).notifier)
          .sendMessage(content: content);

      if (!success && context.mounted) {
        controller.text = content;
        CommonSnackBar.error(context, 'メッセージの送信に失敗しました');
      }
    }

    void startEditing(Message message) {
      editingMessageId.value = message.id;
      editController.text = message.content;
    }

    void cancelEditing() {
      editingMessageId.value = null;
      editController.clear();
    }

    Future<void> saveEdit(Message message) async {
      final newContent = editController.text.trim();
      if (newContent.isEmpty || newContent == message.content) {
        cancelEditing();
        return;
      }

      final success = await ref
          .read(threadChatControllerProvider(controllerArg).notifier)
          .editMessage(message.id, newContent);

      if (success && context.mounted) {
        cancelEditing();
      } else if (!success && context.mounted) {
        CommonSnackBar.error(context, 'メッセージの編集に失敗しました');
      }
    }

    Future<void> confirmDelete(Message message) async {
      final confirmed = await CommonDialog.confirm(
        context: context,
        title: 'メッセージを削除',
        message: 'このメッセージを削除しますか？この操作は取り消せません。',
        confirmLabel: '削除',
        isDestructive: true,
      );

      if (confirmed) {
        final success = await ref
            .read(threadChatControllerProvider(controllerArg).notifier)
            .deleteMessage(message.id);
        if (!success && context.mounted) {
          CommonSnackBar.error(context, 'メッセージの削除に失敗しました');
        }
      }
    }

    void showMessageActions(Message message) {
      showModalBottomSheet(
        context: context,
        builder: (context) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: const Text('編集'),
                onTap: () {
                  Navigator.pop(context);
                  startEditing(message);
                },
              ),
              ListTile(
                leading: Icon(Icons.delete_outline, color: AppColors.error),
                title: Text(
                  '削除',
                  style: AppTextStyles.body2.copyWith(color: AppColors.error),
                ),
                onTap: () {
                  Navigator.pop(context);
                  confirmDelete(message);
                },
              ),
            ],
          ),
        ),
      );
    }

    ref.listen(threadChatControllerProvider(controllerArg), (prev, next) {
      if (next.error != null && prev?.error == null) {
        CommonSnackBar.error(context, next.error!);
        ref
            .read(threadChatControllerProvider(controllerArg).notifier)
            .clearError();
      }
    });

    final chatState = ref.watch(threadChatControllerProvider(controllerArg));
    final displayName = thread.organizationName ?? '企業';

    return CommonScaffold(
      appBar: AppBar(
        title: Row(
          children: [
            UserAvatar(
              initial: displayName.isNotEmpty ? displayName[0] : '?',
              color: AppColors.brand,
              size: 32,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayName, style: AppTextStyles.callout),
                  if (thread.jobTitle != null)
                    Text(
                      thread.jobTitle!,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ],
        ),
        centerTitle: false,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: chatState.isLoading
                ? const LoadingIndicator()
                : chatState.messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        UserAvatar(
                          initial: displayName.isNotEmpty
                              ? displayName[0]
                              : '?',
                          color: AppColors.brand,
                          size: 64,
                        ),
                        const SizedBox(height: 16),
                        Text(displayName, style: AppTextStyles.callout),
                        const SizedBox(height: 4),
                        Text(
                          'メッセージを送ってみましょう',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    reverse: true,
                    controller: scrollController,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm,
                    ),
                    itemCount:
                        chatState.messages.length +
                        (chatState.isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      final messages = chatState.messages;

                      if (chatState.isLoadingMore && index == messages.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: AppSpacing.md,
                          ),
                          child: Center(child: LoadingIndicator(size: 20)),
                        );
                      }

                      final msgIndex = messages.length - 1 - index;
                      final msg = messages[msgIndex];
                      final isMe = msg.senderId == currentUserId;
                      final isEditing = editingMessageId.value == msg.id;

                      final prevMsg = msgIndex > 0
                          ? messages[msgIndex - 1]
                          : null;
                      final nextMsg = msgIndex < messages.length - 1
                          ? messages[msgIndex + 1]
                          : null;
                      final isFirstInGroup =
                          prevMsg == null ||
                          prevMsg.senderId != msg.senderId ||
                          msg.createdAt
                                  .difference(prevMsg.createdAt)
                                  .inMinutes >
                              5;
                      final isLastInGroup =
                          nextMsg == null ||
                          nextMsg.senderId != msg.senderId ||
                          nextMsg.createdAt
                                  .difference(msg.createdAt)
                                  .inMinutes >
                              5;

                      Widget? dateSeparator;
                      if (prevMsg == null ||
                          prevMsg.createdAt.day != msg.createdAt.day ||
                          prevMsg.createdAt.month != msg.createdAt.month ||
                          prevMsg.createdAt.year != msg.createdAt.year) {
                        dateSeparator = _DateSeparator(date: msg.createdAt);
                      }

                      return Column(
                        children: [
                          if (dateSeparator != null) dateSeparator,
                          GestureDetector(
                            onLongPress: isMe
                                ? () => showMessageActions(msg)
                                : null,
                            child: _MessageBubble(
                              message: msg,
                              isMe: isMe,
                              isEditing: isEditing,
                              editController: editController,
                              onSaveEdit: () => saveEdit(msg),
                              onCancelEdit: cancelEditing,
                              isFirstInGroup: isFirstInGroup,
                              isLastInGroup: isLastInGroup,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          if (chatState.otherUserTyping)
            Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.lg,
                bottom: AppSpacing.xs,
              ),
              child: const _TypingIndicator(),
            ),

          MessageInputBar(
            controller: controller,
            onSend: sendMessage,
            isSending: chatState.isSending,
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Date Separator
// =============================================================================

class _DateSeparator extends StatelessWidget {
  const _DateSeparator({required this.date});

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Center(
        child: Text(
          DateFormatter.toRelativeDate(date),
          style: AppTextStyles.caption2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
      ),
    );
  }
}

// =============================================================================
// Message Bubble
// =============================================================================

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMe,
    this.isEditing = false,
    this.editController,
    this.onSaveEdit,
    this.onCancelEdit,
    this.isFirstInGroup = true,
    this.isLastInGroup = true,
  });

  final Message message;
  final bool isMe;
  final bool isEditing;
  final TextEditingController? editController;
  final VoidCallback? onSaveEdit;
  final VoidCallback? onCancelEdit;
  final bool isFirstInGroup;
  final bool isLastInGroup;

  @override
  Widget build(BuildContext context) {
    final bubbleColor = isMe
        ? AppColors.brand
        : AppColors.surfaceTertiary(context);
    final textColor = isMe ? Colors.white : AppColors.textPrimary(context);

    final bottomPadding = isLastInGroup ? 12.0 : 2.0;

    const r = Radius.circular(18);
    const rSmall = Radius.circular(4);
    final borderRadius = isMe
        ? BorderRadius.only(
            topLeft: r,
            topRight: isFirstInGroup ? r : rSmall,
            bottomLeft: r,
            bottomRight: isLastInGroup ? r : rSmall,
          )
        : BorderRadius.only(
            topLeft: isFirstInGroup ? r : rSmall,
            topRight: r,
            bottomLeft: isLastInGroup ? r : rSmall,
            bottomRight: r,
          );

    return Padding(
      padding: EdgeInsets.only(bottom: bottomPadding),
      child: Row(
        mainAxisAlignment: isMe
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            if (isLastInGroup)
              UserAvatar(
                initial: (message.senderName ?? '?')[0],
                color: AppColors.brand,
                size: 24,
              )
            else
              const SizedBox(width: 24),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.7,
              ),
              child: Column(
                crossAxisAlignment: isMe
                    ? CrossAxisAlignment.end
                    : CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: isEditing
                          ? bubbleColor.withValues(alpha: 0.7)
                          : bubbleColor,
                      borderRadius: borderRadius,
                    ),
                    child: isEditing
                        ? _buildEditingContent(context)
                        : Text(
                            message.content,
                            style: AppTextStyles.body1.copyWith(
                              color: textColor,
                            ),
                          ),
                  ),
                  if (isLastInGroup)
                    Padding(
                      padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
                      child: Text(
                        _formatTime(message),
                        style: AppTextStyles.caption2.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(Message msg) {
    final time =
        '${msg.createdAt.hour.toString().padLeft(2, '0')}:${msg.createdAt.minute.toString().padLeft(2, '0')}';
    if (msg.isEdited) return '$time · 編集済み';
    return time;
  }

  Widget _buildEditingContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: editController,
          autofocus: true,
          maxLines: null,
          style: AppTextStyles.body1.copyWith(
            color: isMe ? Colors.white : AppColors.textPrimary(context),
          ),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: EdgeInsets.zero,
            border: InputBorder.none,
            hintText: 'メッセージを編集...',
            hintStyle: AppTextStyles.body1.copyWith(
              color: isMe
                  ? Colors.white.withValues(alpha: 0.6)
                  : AppColors.textSecondary(context),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: onCancelEdit,
              child: Text(
                'キャンセル',
                style: AppTextStyles.caption2.copyWith(
                  color: isMe
                      ? Colors.white.withValues(alpha: 0.8)
                      : AppColors.textSecondary(context),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            GestureDetector(
              onTap: onSaveEdit,
              child: Text(
                '保存',
                style: AppTextStyles.caption2.copyWith(
                  color: isMe ? Colors.white : AppColors.brand,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// =============================================================================
// Typing Indicator
// =============================================================================

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const SizedBox(width: 32),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.surfaceTertiary(context),
            borderRadius: AppRadius.radius160,
          ),
          child: AnimatedBuilder(
            animation: _animController,
            builder: (context, _) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (i) {
                  final delay = i * 0.2;
                  final t = (_animController.value - delay).clamp(0.0, 1.0);
                  final scale = 0.5 + 0.5 * (1 - (2 * t - 1).abs());
                  return Padding(
                    padding: EdgeInsets.only(right: i < 2 ? 4 : 0),
                    child: Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: AppColors.textSecondary(context),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  );
                }),
              );
            },
          ),
        ),
      ],
    );
  }
}
