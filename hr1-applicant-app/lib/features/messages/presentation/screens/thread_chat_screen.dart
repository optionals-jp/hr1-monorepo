import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_applicant_app/features/messages/presentation/controllers/thread_chat_controller.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/attachment_signed_url_provider.dart';

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

    Future<void> sendMessage({List<Map<String, dynamic>>? attachments}) async {
      final content = controller.text.trim();
      if (content.isEmpty && (attachments == null || attachments.isEmpty)) {
        return;
      }

      controller.clear();

      final success = await ref
          .read(threadChatControllerProvider(controllerArg).notifier)
          .sendMessage(content: content, attachments: attachments);

      if (!success && context.mounted) {
        controller.text = content;
      }
    }

    Future<void> pickAndSendAttachment() async {
      try {
        final result = await FilePicker.pickFiles(
          withData: true,
          type: FileType.any,
        );
        if (result == null || result.files.isEmpty) return;
        final file = result.files.single;
        if (file.bytes == null) return;

        if (file.size > 25 * 1024 * 1024) {
          if (context.mounted) {
            CommonSnackBar.error(context, 'ファイルサイズは 25MB 以下にしてください');
          }
          return;
        }

        final mime = _guessMime(file.name, file.extension);
        final storagePath = await ref
            .read(threadChatControllerProvider(controllerArg).notifier)
            .uploadAttachmentBytes(
              organizationId: thread.organizationId,
              bytes: file.bytes!,
              fileName: file.name,
              mimeType: mime,
            );
        if (storagePath == null) return;
        await sendMessage(
          attachments: [
            {
              'storage_path': storagePath,
              'file_name': file.name,
              'mime_type': mime,
              'byte_size': file.size,
            },
          ],
        );
      } catch (e) {
        if (context.mounted) {
          CommonSnackBar.error(context, 'ファイルの添付に失敗しました');
        }
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
        await ref
            .read(threadChatControllerProvider(controllerArg).notifier)
            .softDeleteMessage(message.id);
      }
    }

    Future<void> toggleReaction(String messageId, String emoji) async {
      await ref
          .read(threadChatControllerProvider(controllerArg).notifier)
          .toggleReaction(messageId, emoji);
    }

    Future<void> openReactionPicker(String messageId) async {
      final emoji = await EmojiPickerSheet.show(context);
      if (emoji != null) await toggleReaction(messageId, emoji);
    }

    void showMessageActions(Message message) {
      final isSelf = message.senderId == currentUserId;
      showModalBottomSheet(
        context: context,
        builder: (context) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.add_reaction_outlined),
                title: const Text('リアクション'),
                onTap: () {
                  Navigator.pop(context);
                  openReactionPicker(message.id);
                },
              ),
              if (isSelf) ...[
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
                ? _EmptyState(displayName: displayName)
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
                        crossAxisAlignment: isMe
                            ? CrossAxisAlignment.end
                            : CrossAxisAlignment.start,
                        children: [
                          if (dateSeparator != null) dateSeparator,
                          Padding(
                            padding: EdgeInsets.only(
                              bottom: isLastInGroup ? 12.0 : 2.0,
                              left: isMe ? 0 : 32,
                            ),
                            child: isEditing
                                ? _EditingBubble(
                                    controller: editController,
                                    onSave: () => saveEdit(msg),
                                    onCancel: cancelEditing,
                                  )
                                : _MessageRow(
                                    message: msg,
                                    isMe: isMe,
                                    isFirstInGroup: isFirstInGroup,
                                    isLastInGroup: isLastInGroup,
                                    currentUserId: currentUserId,
                                    onLongPress: () => showMessageActions(msg),
                                    onToggleReaction: (emoji) =>
                                        toggleReaction(msg.id, emoji),
                                    onAddReaction: () =>
                                        openReactionPicker(msg.id),
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

          _InputBar(
            controller: controller,
            sending: chatState.isSending,
            onSend: () => sendMessage(),
            onPickAttachment: pickAndSendAttachment,
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Input Bar
// =============================================================================

class _InputBar extends StatelessWidget {
  const _InputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onPickAttachment,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final VoidCallback onPickAttachment;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface(context),
      padding: EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.sm,
        MediaQuery.of(context).padding.bottom + AppSpacing.sm,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          IconButton(
            icon: Icon(
              Icons.attach_file_outlined,
              color: AppColors.textSecondary(context),
            ),
            onPressed: sending ? null : onPickAttachment,
          ),
          Expanded(
            child: MessageInputBar(
              controller: controller,
              onSend: onSend,
              isSending: sending,
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Message Row
// =============================================================================

class _MessageRow extends ConsumerWidget {
  const _MessageRow({
    required this.message,
    required this.isMe,
    required this.isFirstInGroup,
    required this.isLastInGroup,
    required this.currentUserId,
    required this.onLongPress,
    required this.onToggleReaction,
    required this.onAddReaction,
  });

  final Message message;
  final bool isMe;
  final bool isFirstInGroup;
  final bool isLastInGroup;
  final String currentUserId;
  final VoidCallback onLongPress;
  final void Function(String emoji) onToggleReaction;
  final VoidCallback onAddReaction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!isMe) ...[
          if (isLastInGroup)
            UserAvatar(
              initial: (message.senderName?.isNotEmpty ?? false)
                  ? message.senderName![0]
                  : '?',
              size: 24,
              imageUrl: message.senderAvatarUrl,
            )
          else
            const SizedBox(width: 24),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: MessageBubble(
            content: message.content,
            isSelf: isMe,
            isDeleted: message.isDeleted,
            isFirstInGroup: isFirstInGroup,
            isLastInGroup: isLastInGroup,
            senderName: isMe ? null : message.senderName,
            createdAtLabel: _formatTime(message),
            isEdited: message.isEdited,
            mentionsCurrentUser: message.mentionedUserIds.contains(
              currentUserId,
            ),
            onLongPress: onLongPress,
            attachments: message.attachments.isEmpty
                ? null
                : _AttachmentsList(attachments: message.attachments),
            reactions: message.reactions.isEmpty
                ? null
                : MessageReactionBar(
                    reactions: message.reactions,
                    currentUserId: currentUserId,
                    onToggle: onToggleReaction,
                    onAddReaction: onAddReaction,
                  ),
          ),
        ),
      ],
    );
  }

  String _formatTime(Message msg) {
    return '${msg.createdAt.toLocal().hour.toString().padLeft(2, '0')}:${msg.createdAt.toLocal().minute.toString().padLeft(2, '0')}';
  }
}

class _AttachmentsList extends ConsumerWidget {
  const _AttachmentsList({required this.attachments});

  final List<MessageAttachment> attachments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: attachments.map((a) {
        final urlAsync = ref.watch(attachmentSignedUrlProvider(a.storagePath));
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: MessageAttachmentView(
            attachment: a,
            signedUrl: urlAsync.value,
          ),
        );
      }).toList(),
    );
  }
}

// =============================================================================
// Empty State
// =============================================================================

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.displayName});

  final String displayName;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          UserAvatar(
            initial: displayName.isNotEmpty ? displayName[0] : '?',
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

String _guessMime(String fileName, String? extension) {
  final ext = (extension ?? fileName.split('.').last).toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}
