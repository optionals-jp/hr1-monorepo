import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/message_thread.dart';
import '../providers/messages_providers.dart';

const _pageSize = 30;

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
  List<Message> _messages = [];
  bool _loading = true;
  bool _sending = false;
  bool _loadingMore = false;
  bool _hasMore = true;
  RealtimeChannel? _channel;
  RealtimeChannel? _presenceChannel;
  String? _editingMessageId;
  final _editController = TextEditingController();
  bool _otherUserTyping = false;
  Timer? _typingDebounceTimer;
  bool _isTyping = false;

  String get _currentUserId => ref.read(appUserProvider)?.id ?? '';

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _subscribeRealtime();
    _setupPresence();
    _scrollController.addListener(_onScroll);
    _controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _controller.dispose();
    _editController.dispose();
    _scrollController.dispose();
    _typingDebounceTimer?.cancel();
    if (_channel != null) {
      Supabase.instance.client.removeChannel(_channel!);
    }
    if (_presenceChannel != null) {
      Supabase.instance.client.removeChannel(_presenceChannel!);
    }
    super.dispose();
  }

  Future<void> _loadMessages() async {
    final repo = ref.read(messagesRepositoryProvider);
    final messages = await repo.getMessagesPaginated(
      widget.thread.id,
      limit: _pageSize,
    );
    if (mounted) {
      setState(() {
        _messages = messages;
        _loading = false;
        _hasMore = messages.length >= _pageSize;
      });
      _scrollToBottom();
      repo.markAsRead(widget.thread.id, _currentUserId);
    }
  }

  Future<void> _loadOlderMessages() async {
    if (_loadingMore || !_hasMore || _messages.isEmpty) return;
    setState(() => _loadingMore = true);
    final repo = ref.read(messagesRepositoryProvider);
    final oldestCreatedAt = _messages.first.createdAt;
    final olderMessages = await repo.getMessagesPaginated(
      widget.thread.id,
      before: oldestCreatedAt,
      limit: _pageSize,
    );
    if (mounted) {
      setState(() {
        _messages = [...olderMessages, ..._messages];
        _loadingMore = false;
        _hasMore = olderMessages.length >= _pageSize;
      });
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels <=
        _scrollController.position.minScrollExtent + 50) {
      _loadOlderMessages();
    }
  }

  void _subscribeRealtime() {
    _channel = Supabase.instance.client
        .channel('messages:${widget.thread.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: widget.thread.id,
          ),
          callback: (payload) async {
            final newMsg = payload.newRecord;
            if (newMsg.isEmpty) return;
            final senderResponse = await Supabase.instance.client
                .from('profiles')
                .select('id, display_name, role')
                .eq('id', newMsg['sender_id'] as String)
                .single();
            final msg = Message.fromJson({
              ...newMsg,
              'sender': senderResponse,
            });
            if (mounted) {
              setState(() {
                if (!_messages.any((m) => m.id == msg.id)) {
                  _messages = [..._messages, msg];
                }
              });
              _scrollToBottom();
              if (msg.senderId != _currentUserId) {
                ref
                    .read(messagesRepositoryProvider)
                    .markAsRead(widget.thread.id, _currentUserId);
              }
            }
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: widget.thread.id,
          ),
          callback: (payload) {
            final updated = payload.newRecord;
            if (updated.isEmpty || !mounted) return;
            setState(() {
              _messages = _messages.map((m) {
                if (m.id == updated['id']) {
                  return m.copyWith(
                    content: updated['content'] as String?,
                    editedAt: updated['edited_at'] != null
                        ? DateTime.parse(updated['edited_at'] as String)
                        : null,
                  );
                }
                return m;
              }).toList();
            });
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.delete,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: widget.thread.id,
          ),
          callback: (payload) {
            final old = payload.oldRecord;
            if (old.isEmpty || !mounted) return;
            setState(() {
              _messages = _messages.where((m) => m.id != old['id']).toList();
            });
          },
        )
        .subscribe();
  }

  void _setupPresence() {
    _presenceChannel = Supabase.instance.client
        .channel('typing:${widget.thread.id}')
        .onPresenceSync((payload) {
      if (!mounted) return;
      final presences = _presenceChannel!.presenceState();
      bool otherTyping = false;
      for (final state in presences) {
        for (final presence in state.presences) {
          if (presence.payload['user_id'] != _currentUserId &&
              presence.payload['is_typing'] == true) {
            otherTyping = true;
            break;
          }
        }
        if (otherTyping) break;
      }
      setState(() => _otherUserTyping = otherTyping);
    }).subscribe((status, [error]) async {
      if (status == RealtimeSubscribeStatus.subscribed) {
        await _presenceChannel!.track({
          'user_id': _currentUserId,
          'is_typing': false,
        });
      }
    });
  }

  void _onTextChanged() {
    if (_controller.text.isNotEmpty && !_isTyping) {
      _isTyping = true;
      _presenceChannel?.track({
        'user_id': _currentUserId,
        'is_typing': true,
      });
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_isTyping) {
        _isTyping = false;
        _presenceChannel?.track({
          'user_id': _currentUserId,
          'is_typing': false,
        });
      }
    });
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
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({
      'user_id': _currentUserId,
      'is_typing': false,
    });
    try {
      await ref.read(messagesRepositoryProvider).sendMessage(
            threadId: widget.thread.id,
            senderId: _currentUserId,
            content: content,
          );
    } catch (e) {
      if (mounted) {
        _controller.text = content;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの送信に失敗しました'),
            backgroundColor: AppColors.error,
          ),
        );
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
      await ref.read(messagesRepositoryProvider).editMessage(messageId, content);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの編集に失敗しました'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _deleteMessage(String messageId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('メッセージの削除'),
        content: const Text('このメッセージを削除しますか？この操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('削除'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(messagesRepositoryProvider).deleteMessage(messageId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの削除に失敗しました'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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
              leading: Icon(Icons.delete_outline,
                  color: AppColors.error, size: 22),
              title: Text('削除', style: TextStyle(color: AppColors.error)),
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
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Text(displayName, style: AppTextStyles.subtitle),
          ],
        ),
        centerTitle: false,
      ),
      body: Column(
        children: [
          // メッセージリスト
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'メッセージはまだありません',
                          style: AppTextStyles.body.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.45),
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.lg,
                          vertical: AppSpacing.sm,
                        ),
                        itemCount: _messages.length + (_loadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_loadingMore && index == 0) {
                            return const Padding(
                              padding:
                                  EdgeInsets.symmetric(vertical: AppSpacing.md),
                              child: Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                ),
                              ),
                            );
                          }
                          final msgIndex = _loadingMore ? index - 1 : index;
                          final msg = _messages[msgIndex];
                          final isMe = msg.senderId == _currentUserId;
                          final isEditing = _editingMessageId == msg.id;

                          return GestureDetector(
                            onLongPress:
                                isMe ? () => _showMessageActions(msg) : null,
                            child: isEditing
                                ? _EditingBubble(
                                    controller: _editController,
                                    onSave: _saveEdit,
                                    onCancel: _cancelEditing,
                                  )
                                : _MessageBubble(
                                    message: msg,
                                    isMe: isMe,
                                  ),
                          );
                        },
                      ),
          ),

          // タイピングインジケーター
          if (_otherUserTyping)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xs,
              ),
              child: _TypingIndicator(),
            ),

          // 入力エリア — Teams スタイル（角丸テキストフィールド + 送信ボタン）
          Container(
            color: theme.colorScheme.surface,
            padding: EdgeInsets.fromLTRB(
              AppSpacing.md,
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
                          : const Color(0xFFF5F5F5),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: TextField(
                      controller: _controller,
                      decoration: InputDecoration(
                        hintText: 'メッセージを入力',
                        hintStyle: AppTextStyles.bodySmall.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.4),
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        isDense: true,
                      ),
                      style: AppTextStyles.bodySmall,
                      maxLines: 4,
                      minLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
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
                      icon: Icon(
                        Icons.send_rounded,
                        color: _sending
                            ? theme.colorScheme.onSurface
                                .withValues(alpha: 0.3)
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
      style: AppTextStyles.caption.copyWith(
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
                    color: AppColors.brandPrimary.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  TextField(
                    controller: controller,
                    autofocus: true,
                    maxLines: 4,
                    minLines: 1,
                    style: AppTextStyles.bodySmall,
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
                              horizontal: AppSpacing.sm),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'キャンセル',
                          style: AppTextStyles.caption.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6),
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      TextButton(
                        onPressed: onSave,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          '保存',
                          style: AppTextStyles.caption.copyWith(
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
  const _MessageBubble({
    required this.message,
    required this.isMe,
  });

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
    final textColor =
        isMe ? Colors.white : theme.colorScheme.onSurface;
    final metaColor = isMe
        ? Colors.white.withValues(alpha: 0.7)
        : theme.colorScheme.onSurface.withValues(alpha: 0.45);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
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
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment:
                  isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                if (!isMe)
                  Padding(
                    padding: const EdgeInsets.only(
                        left: AppSpacing.xs, bottom: 3),
                    child: Text(
                      message.senderName ?? '相手',
                      style: AppTextStyles.label.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
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
                    style: AppTextStyles.bodySmall.copyWith(color: textColor),
                  ),
                ),
                Padding(
                  padding:
                      const EdgeInsets.only(top: 3, left: 4, right: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (message.isEdited)
                        Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text(
                            '編集済み',
                            style: AppTextStyles.label.copyWith(
                              color: metaColor,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      Text(
                        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                        style: AppTextStyles.label.copyWith(
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
