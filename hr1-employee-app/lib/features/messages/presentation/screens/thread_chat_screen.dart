import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_chat_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/thread_realtime_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/attachment_signed_url_provider.dart';

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

    final currentUser = ref.read(appUserProvider);
    final currentUserId = currentUser?.id ?? '';
    final organizationId = currentUser?.activeOrganizationId ?? '';
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

    Future<void> sendMessage({List<Map<String, dynamic>>? attachments}) async {
      final content = controller.text.trim();
      if ((content.isEmpty && (attachments == null || attachments.isEmpty)) ||
          sending.value ||
          content.length > 5000) {
        return;
      }
      sending.value = true;
      controller.clear();
      ref
          .read(threadRealtimeControllerProvider(realtimeArg).notifier)
          .resetTyping();
      try {
        await ref
            .read(threadChatControllerProvider.notifier)
            .sendMessageV2(
              threadId: thread.id,
              content: content,
              mentionedUserIds: extractMentionedUserIds(content),
              attachments: attachments,
            );
      } catch (e) {
        if (context.mounted) {
          controller.text = content;
          CommonSnackBar.error(context, 'メッセージの送信に失敗しました');
        }
      }
      if (context.mounted) sending.value = false;
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

        // 25MB 上限（MIME スキャンは DB 側 check で弾く）
        if (file.size > 25 * 1024 * 1024) {
          if (context.mounted) {
            CommonSnackBar.error(context, 'ファイルサイズは 25MB 以下にしてください');
          }
          return;
        }

        sending.value = true;
        // サーバー側で message_id を採番する前にアップロード先が必要なため、
        // クライアント側で仮 ID を用い、message_id 確定後に metadata を紐づける運用にする。
        // ただし現行 send_message_v2 は attachments メタを受け取って DB 側で message_attachments に INSERT するため、
        // ここでは storage_path のみ先に確保する。
        final tempMessageKey = DateTime.now().millisecondsSinceEpoch.toString();
        final storagePath = await ref
            .read(threadChatControllerProvider.notifier)
            .uploadAttachment(
              organizationId: organizationId,
              threadId: thread.id,
              messageId: tempMessageKey,
              bytes: file.bytes!,
              fileName: file.name,
              mimeType: _guessMime(file.name, file.extension),
            );
        final attachmentMeta = {
          'storage_path': storagePath,
          'file_name': file.name,
          'mime_type': _guessMime(file.name, file.extension),
          'byte_size': file.size,
        };
        sending.value = false;
        await sendMessage(attachments: [attachmentMeta]);
      } catch (e) {
        sending.value = false;
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
            .softDeleteMessage(messageId);
      } catch (e) {
        if (context.mounted) CommonSnackBar.error(context, 'メッセージの削除に失敗しました');
      }
    }

    Future<void> toggleReaction(String messageId, String emoji) async {
      try {
        await ref
            .read(threadChatControllerProvider.notifier)
            .toggleReaction(messageId, emoji);
      } catch (e) {
        if (context.mounted) {
          CommonSnackBar.error(context, 'リアクションの変更に失敗しました');
        }
      }
    }

    Future<void> openReactionPicker(String messageId) async {
      final emoji = await EmojiPickerSheet.show(context);
      if (emoji != null) await toggleReaction(messageId, emoji);
    }

    void showMessageActions(Message message) {
      final isSelf = message.senderId == currentUserId;
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
                leading: const Icon(Icons.add_reaction_outlined, size: 22),
                title: const Text('リアクション'),
                onTap: () {
                  Navigator.pop(ctx);
                  openReactionPicker(message.id);
                },
              ),
              if (isSelf) ...[
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
            UserAvatar(
              initial: displayName.isNotEmpty ? displayName[0] : '?',
              size: 32,
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
                ? _EmptyState(displayName: displayName)
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
                        crossAxisAlignment: isMe
                            ? CrossAxisAlignment.end
                            : CrossAxisAlignment.start,
                        children: [
                          if (dateSeparator != null) dateSeparator,
                          Padding(
                            padding: EdgeInsets.only(
                              bottom: isLastInGroup ? 12.0 : 2.0,
                              left: isMe ? 0 : (isLastInGroup ? 32 : 32),
                            ),
                            child: isEditing
                                ? _EditingBubble(
                                    controller: editController,
                                    onSave: saveEdit,
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

          if (otherUserTyping)
            Padding(
              padding: const EdgeInsets.only(
                left: AppSpacing.lg,
                bottom: AppSpacing.xs,
              ),
              child: _TypingIndicator(),
            ),

          _InputBar(
            controller: controller,
            sending: sending.value,
            onSend: () => sendMessage(),
            onPickAttachment: pickAndSendAttachment,
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Input Bar（添付ボタン付き）
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
// Message Row（添付・リアクション統合）
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
