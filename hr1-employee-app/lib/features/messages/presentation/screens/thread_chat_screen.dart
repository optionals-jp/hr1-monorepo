import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_chat_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_realtime_controller.dart';

class ThreadChatScreen extends HookConsumerWidget {
  const ThreadChatScreen({super.key, required this.thread});

  final MessageThread thread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = useTextEditingController();
    final scrollController = useScrollController();
    final editController = useTextEditingController();
    final sending = useState(false);
    final editingMessageId = useState<String?>(null);

    final currentUserId = ref.read(appUserProvider)?.id ?? '';
    final realtimeArg = (threadId: thread.id, currentUserId: currentUserId);

    useEffect(() {
      void onScroll() {
        if (scrollController.position.pixels >=
            scrollController.position.maxScrollExtent - 50) {
          ref
              .read(threadRealtimeControllerProvider(realtimeArg).notifier)
              .loadOlderMessages();
        }
      }

      void onTextChanged() {
        ref
            .read(threadRealtimeControllerProvider(realtimeArg).notifier)
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
      if (content.isEmpty || sending.value || content.length > 5000) return;
      sending.value = true;
      controller.clear();
      ref
          .read(threadRealtimeControllerProvider(realtimeArg).notifier)
          .resetTyping();
      try {
        await ref
            .read(threadChatControllerProvider.notifier)
            .sendMessage(
              threadId: thread.id,
              senderId: currentUserId,
              content: content,
            );
      } catch (e) {
        if (context.mounted) {
          controller.text = content;
          CommonSnackBar.error(context, 'メッセージの送信に失敗しました');
        }
      }
      if (context.mounted) sending.value = false;
    }

    void startEditing(Message message) {
      editingMessageId.value = message.id;
      editController.text = message.content;
    }

    void cancelEditing() {
      editingMessageId.value = null;
      editController.clear();
    }

    Future<void> saveEdit() async {
      final content = editController.text.trim();
      if (content.isEmpty || editingMessageId.value == null) return;
      final messageId = editingMessageId.value!;
      cancelEditing();
      try {
        await ref
            .read(threadChatControllerProvider.notifier)
            .editMessage(messageId, content);
      } catch (e) {
        if (context.mounted) CommonSnackBar.error(context, 'メッセージの編集に失敗しました');
      }
    }

    Future<void> deleteMessage(String messageId) async {
      final confirmed = await CommonDialog.confirm(
        context: context,
        title: 'メッセージの削除',
        message: 'このメッセージを削除しますか？この操作は取り消せません。',
        confirmLabel: '削除',
        isDestructive: true,
      );
      if (!confirmed) return;
      try {
        await ref
            .read(threadChatControllerProvider.notifier)
            .deleteMessage(messageId);
      } catch (e) {
        if (context.mounted) CommonSnackBar.error(context, 'メッセージの削除に失敗しました');
      }
    }

    void showMessageActions(Message message) {
      showModalBottomSheet(
        context: context,
        builder: (ctx) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: AppSpacing.sm),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border(context),
                  borderRadius: AppRadius.radius20,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: const Icon(Icons.edit_outlined, size: 22),
                title: const Text('編集'),
                onTap: () {
                  Navigator.pop(ctx);
                  startEditing(message);
                },
              ),
              ListTile(
                leading: Icon(
                  Icons.delete_outline,
                  color: AppColors.error,
                  size: 22,
                ),
                title: Text(
                  '削除',
                  style: AppTextStyles.body1.copyWith(color: AppColors.error),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  deleteMessage(message.id);
                },
              ),
            ],
          ),
        ),
      );
    }

    final displayName = thread.participantName ?? thread.title ?? '相手';
    final realtimeState = ref.watch(
      threadRealtimeControllerProvider(realtimeArg),
    );

    final messages = realtimeState.messages;
    final loading = realtimeState.loading;
    final loadingMore = realtimeState.loadingMore;
    final otherUserTyping = realtimeState.otherUserTyping;

    return CommonScaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.brand,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  displayName.isNotEmpty ? displayName[0] : '?',
                  style: AppTextStyles.caption1.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(displayName, style: AppTextStyles.headline),
          ],
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          Expanded(
            child: loading
                ? const LoadingIndicator()
                : messages.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: AppColors.brand,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              displayName.isNotEmpty ? displayName[0] : '?',
                              style: AppTextStyles.title2.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
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
                    itemCount: messages.length + (loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (loadingMore && index == messages.length) {
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
                            child: isEditing
                                ? _EditingBubble(
                                    controller: editController,
                                    onSave: saveEdit,
                                    onCancel: cancelEditing,
                                  )
                                : _MessageBubble(
                                    message: msg,
                                    isMe: isMe,
                                    isFirstInGroup: isFirstInGroup,
                                    isLastInGroup: isLastInGroup,
                                  ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          if (otherUserTyping)
            Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.lg,
                bottom: AppSpacing.xs,
              ),
              child: _TypingIndicator(),
            ),

          MessageInputBar(
            controller: controller,
            onSend: sendMessage,
            isSending: sending.value,
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
          _format(date.toLocal()),
          style: AppTextStyles.caption2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
      ),
    );
  }

  String _format(DateTime dt) {
    final now = DateTime.now();
    if (dt.year == now.year && dt.month == now.month && dt.day == now.day) {
      return '今日';
    }
    final yesterday = now.subtract(const Duration(days: 1));
    if (dt.year == yesterday.year &&
        dt.month == yesterday.month &&
        dt.day == yesterday.day) {
      return '昨日';
    }
    if (dt.year == now.year) {
      return '${dt.month}月${dt.day}日';
    }
    return '${dt.year}年${dt.month}月${dt.day}日';
  }
}

// =============================================================================
// Typing Indicator
// =============================================================================

class _TypingIndicator extends StatefulWidget {
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
                          color: AppColors.textTertiary(context),
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

// =============================================================================
// Editing Bubble
// =============================================================================

class _EditingBubble extends StatelessWidget {
  const _EditingBubble({
    required this.controller,
    required this.onSave,
    required this.onCancel,
  });

  final TextEditingController controller;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.7,
              ),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.brand.withValues(alpha: 0.08),
                  borderRadius: AppRadius.radius160,
                  border: Border.all(
                    color: AppColors.brand.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    TextField(
                      controller: controller,
                      autofocus: true,
                      maxLines: 4,
                      minLines: 1,
                      style: AppTextStyles.body1,
                      decoration: const InputDecoration(
                        isDense: true,
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GestureDetector(
                          onTap: onCancel,
                          child: Text(
                            'キャンセル',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.textSecondary(context),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        GestureDetector(
                          onTap: onSave,
                          child: Text(
                            '保存',
                            style: AppTextStyles.caption2.copyWith(
                              color: AppColors.brand,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
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
    this.isFirstInGroup = true,
    this.isLastInGroup = true,
  });

  final Message message;
  final bool isMe;
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
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.brand,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    (message.senderName ?? '?')[0],
                    style: AppTextStyles.caption2.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
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
                      color: bubbleColor,
                      borderRadius: borderRadius,
                    ),
                    child: Text(
                      message.content,
                      style: AppTextStyles.body1.copyWith(color: textColor),
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
}
