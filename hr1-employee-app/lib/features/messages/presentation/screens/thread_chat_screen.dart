import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/message_thread.dart';
import '../../../../shared/widgets/common_dialog.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../controllers/thread_chat_controller.dart';
import '../controllers/thread_realtime_controller.dart';

/// スレッドチャット画面 — Teams チャットスタイル
class ThreadChatScreen extends ConsumerStatefulWidget {
  const ThreadChatScreen({super.key, required this.thread});

  final MessageThread thread;

  @override
  ConsumerState<ThreadChatScreen> createState() => _ThreadChatScreenState();
}

class _ThreadChatScreenState extends ConsumerState<ThreadChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _sending = false;
  String? _editingMessageId;
  final _editController = TextEditingController();

  String get _currentUserId => ref.read(appUserProvider)?.id ?? '';

  ({String threadId, String currentUserId}) get _realtimeArg =>
      (threadId: widget.thread.id, currentUserId: _currentUserId);

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _controller.dispose();
    _editController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels <=
        _scrollController.position.minScrollExtent + 50) {
      ref
          .read(threadRealtimeControllerProvider(_realtimeArg).notifier)
          .loadOlderMessages();
    }
  }

  void _onTextChanged() {
    ref
        .read(threadRealtimeControllerProvider(_realtimeArg).notifier)
        .onTextChanged(_controller.text);
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final content = _controller.text.trim();
    if (content.isEmpty || _sending || content.length > 5000) return;
    setState(() => _sending = true);
    _controller.clear();
    ref
        .read(threadRealtimeControllerProvider(_realtimeArg).notifier)
        .resetTyping();
    try {
      await ref
          .read(threadChatControllerProvider.notifier)
          .sendMessage(
            threadId: widget.thread.id,
            senderId: _currentUserId,
            content: content,
          );
    } catch (e) {
      if (mounted) {
        _controller.text = content;
        CommonSnackBar.error(context, 'メッセージの送信に失敗しました');
      }
    }
    if (mounted) setState(() => _sending = false);
  }

  void _startEditing(Message message) {
    setState(() {
      _editingMessageId = message.id;
      _editController.text = message.content;
    });
  }

  void _cancelEditing() {
    setState(() {
      _editingMessageId = null;
      _editController.clear();
    });
  }

  Future<void> _saveEdit() async {
    final content = _editController.text.trim();
    if (content.isEmpty || _editingMessageId == null) return;
    final messageId = _editingMessageId!;
    _cancelEditing();
    try {
      await ref
          .read(threadChatControllerProvider.notifier)
          .editMessage(messageId, content);
    } catch (e) {
      CommonSnackBar.error(context, 'メッセージの編集に失敗しました');
    }
  }

  Future<void> _deleteMessage(String messageId) async {
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
      CommonSnackBar.error(context, 'メッセージの削除に失敗しました');
    }
  }

  void _showMessageActions(Message message) {
    final theme = Theme.of(context);
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
                color: theme.colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            ListTile(
              leading: const Icon(Icons.edit_outlined, size: 22),
              title: const Text('編集'),
              onTap: () {
                Navigator.pop(ctx);
                _startEditing(message);
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
                _deleteMessage(message.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayName =
        widget.thread.participantName ?? widget.thread.title ?? '相手';
    final theme = Theme.of(context);
    final realtimeState = ref.watch(
      threadRealtimeControllerProvider(_realtimeArg),
    );

    // 新しいメッセージが追加されたらスクロール
    ref.listen(threadRealtimeControllerProvider(_realtimeArg), (prev, next) {
      if (prev != null &&
          next.messages.length > prev.messages.length &&
          !next.loading) {
        _scrollToBottom();
      }
    });

    final messages = realtimeState.messages;
    final loading = realtimeState.loading;
    final loadingMore = realtimeState.loadingMore;
    final otherUserTyping = realtimeState.otherUserTyping;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            // ミニアバター（Teams チャットヘッダー風）
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: AppColors.brandPrimary,
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
            const SizedBox(width: 10),
            Text(displayName, style: AppTextStyles.headline),
          ],
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // メッセージリスト
          Expanded(
            child: loading
                ? const LoadingIndicator()
                : messages.isEmpty
                ? Center(
                    child: Text(
                      'メッセージはまだありません',
                      style: AppTextStyles.body2.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.45,
                        ),
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm,
                    ),
                    itemCount: messages.length + (loadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (loadingMore && index == 0) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: AppSpacing.md,
                          ),
                          child: Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: LoadingIndicator(size: 20),
                            ),
                          ),
                        );
                      }
                      final msgIndex = loadingMore ? index - 1 : index;
                      final msg = messages[msgIndex];
                      final isMe = msg.senderId == _currentUserId;
                      final isEditing = _editingMessageId == msg.id;

                      return GestureDetector(
                        onLongPress: isMe
                            ? () => _showMessageActions(msg)
                            : null,
                        child: isEditing
                            ? _EditingBubble(
                                controller: _editController,
                                onSave: _saveEdit,
                                onCancel: _cancelEditing,
                              )
                            : _MessageBubble(message: msg, isMe: isMe),
                      );
                    },
                  ),
          ),

          // タイピングインジケーター
          if (otherUserTyping)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xs,
              ),
              child: _TypingIndicator(),
            ),

          // 入力エリア — SearchBox と同じピル型デザイン
          Container(
            color: theme.colorScheme.surface,
            padding: EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
              AppSpacing.sm,
              MediaQuery.of(context).padding.bottom + AppSpacing.sm,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Container(
                    constraints: const BoxConstraints(minHeight: 40),
                    decoration: BoxDecoration(
                      color: theme.brightness == Brightness.dark
                          ? theme.colorScheme.surfaceContainerHighest
                          : const Color(0xFFEFEFEF),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(left: 14, bottom: 10),
                          child: AppIcons.directbox(
                            size: 20,
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.4,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            decoration: InputDecoration(
                              hintText: 'メッセージを入力',
                              hintStyle: AppTextStyles.caption1.copyWith(
                                color: theme.colorScheme.onSurface.withValues(
                                  alpha: 0.5,
                                ),
                              ),
                              filled: false,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 10,
                              ),
                              isDense: true,
                            ),
                            style: AppTextStyles.caption1,
                            maxLines: 4,
                            minLines: 1,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _sendMessage(),
                          ),
                        ),
                        const SizedBox(width: 14),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Padding(
                  padding: const EdgeInsets.only(bottom: 2),
                  child: SizedBox(
                    width: 36,
                    height: 36,
                    child: IconButton(
                      onPressed: _sending ? null : _sendMessage,
                      icon: AppIcons.send(
                        color: _sending
                            ? theme.colorScheme.onSurface.withValues(alpha: 0.3)
                            : AppColors.brandPrimary,
                        size: 22,
                      ),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ],
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
  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  int _dotCount = 0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
    _animController.addListener(_onTick);
  }

  void _onTick() {
    final newCount = (_animController.value * 4).floor().clamp(0, 3);
    if (newCount != _dotCount) setState(() => _dotCount = newCount);
  }

  @override
  void dispose() {
    _animController.removeListener(_onTick);
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Text(
      '${'.' * _dotCount} 入力中',
      style: AppTextStyles.caption2.copyWith(
        color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
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
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.brandPrimary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.brandPrimary.withValues(alpha: 0.3),
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
                    style: AppTextStyles.caption1,
                    decoration: const InputDecoration(
                      isDense: true,
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: AppSpacing.xs,
                      ),
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextButton(
                        onPressed: onCancel,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'キャンセル',
                          style: AppTextStyles.caption2.copyWith(
                            color: theme.colorScheme.onSurface.withValues(
                              alpha: 0.6,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      TextButton(
                        onPressed: onSave,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.sm,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          '保存',
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.brandPrimary,
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
        ],
      ),
    );
  }
}

// =============================================================================
// Message Bubble — Teams スタイル
// =============================================================================

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMe});

  final Message message;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Teams スタイル: 送信=ブランドカラー、受信=グレー塗り（ボーダーなし）
    final bubbleColor = isMe
        ? AppColors.brandPrimary
        : (theme.brightness == Brightness.dark
              ? theme.colorScheme.surfaceContainerHighest
              : const Color(0xFFF0F0F0));
    final textColor = isMe ? Colors.white : theme.colorScheme.onSurface;
    final metaColor = isMe
        ? Colors.white.withValues(alpha: 0.7)
        : theme.colorScheme.onSurface.withValues(alpha: 0.45);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        mainAxisAlignment: isMe
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            // アバター（Teams: 小さめの丸アバター）
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: AppColors.brandPrimary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  (message.senderName ?? '?')[0],
                  style: AppTextStyles.caption1.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isMe
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding: const EdgeInsets.only(
                      left: AppSpacing.xs,
                      bottom: 3,
                    ),
                    child: Text(
                      message.senderName ?? '相手',
                      style: AppTextStyles.caption1.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.55,
                        ),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: bubbleColor,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                  ),
                  child: Text(
                    message.content,
                    style: AppTextStyles.caption1.copyWith(color: textColor),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (message.isEdited)
                        Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text(
                            '編集済み',
                            style: AppTextStyles.caption1.copyWith(
                              fontWeight: FontWeight.w500,
                              color: metaColor,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      Text(
                        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                        style: AppTextStyles.caption1.copyWith(
                          fontWeight: FontWeight.w500,
                          color: metaColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (isMe) const SizedBox(width: AppSpacing.sm),
        ],
      ),
    );
  }
}
