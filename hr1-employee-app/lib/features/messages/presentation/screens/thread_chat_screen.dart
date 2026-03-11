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

/// スレッドチャット画面（社員向け）
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

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Realtime (INSERT / UPDATE / DELETE)
  // ---------------------------------------------------------------------------

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
                final repo = ref.read(messagesRepositoryProvider);
                repo.markAsRead(widget.thread.id, _currentUserId);
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
            if (updated.isEmpty) return;

            if (mounted) {
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
            }
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
            if (old.isEmpty) return;

            if (mounted) {
              setState(() {
                _messages =
                    _messages.where((m) => m.id != old['id']).toList();
              });
            }
          },
        )
        .subscribe();
  }

  // ---------------------------------------------------------------------------
  // Typing indicator (Presence)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Send / Edit / Delete
  // ---------------------------------------------------------------------------

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

    // タイピング状態をリセット
    _isTyping = false;
    _typingDebounceTimer?.cancel();
    _presenceChannel?.track({
      'user_id': _currentUserId,
      'is_typing': false,
    });

    try {
      final repo = ref.read(messagesRepositoryProvider);
      await repo.sendMessage(
        threadId: widget.thread.id,
        senderId: _currentUserId,
        content: content,
      );
    } catch (e) {
      // 送信失敗時は入力内容を復元
      if (mounted) {
        _controller.text = content;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの送信に失敗しました'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }

    if (mounted) {
      setState(() => _sending = false);
    }
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
      final repo = ref.read(messagesRepositoryProvider);
      await repo.editMessage(messageId, content);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの編集に失敗しました'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _deleteMessage(String messageId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('メッセージの削除'),
        content: const Text('このメッセージを削除しますか？この操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('削除'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(messagesRepositoryProvider);
      await repo.deleteMessage(messageId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('メッセージの削除に失敗しました'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showMessageActions(Message message) {
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
                _startEditing(message);
              },
            ),
            ListTile(
              leading: Icon(Icons.delete_outline, color: AppColors.error),
              title: Text('削除',
                  style: TextStyle(color: AppColors.error)),
              onTap: () {
                Navigator.pop(context);
                _deleteMessage(message.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final displayName = widget.thread.applicantName ?? '応募者';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(displayName, style: AppTextStyles.subtitle),
            if (widget.thread.jobTitle != null)
              Text(
                widget.thread.jobTitle!,
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
          ],
        ),
        elevation: 0,
        scrolledUnderElevation: 1,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'メッセージはまだありません',
                          style: AppTextStyles.body.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        itemCount:
                            _messages.length + (_loadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (_loadingMore && index == 0) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(
                                  vertical: AppSpacing.md),
                              child: Center(
                                child: SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                              ),
                            );
                          }

                          final msgIndex =
                              _loadingMore ? index - 1 : index;
                          final msg = _messages[msgIndex];
                          final isMe = msg.senderId == _currentUserId;
                          final isEditing =
                              _editingMessageId == msg.id;

                          return GestureDetector(
                            onLongPress:
                                isMe ? () => _showMessageActions(msg) : null,
                            child: isEditing
                                ? _EditingBubble(
                                    message: msg,
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
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: AppColors.border.withValues(alpha: 0.5)),
              ),
            ),
            padding: EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.sm,
              MediaQuery.of(context).padding.bottom + AppSpacing.sm,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'メッセージを入力...',
                      hintStyle: AppTextStyles.body.copyWith(
                        color: AppColors.textSecondary,
                      ),
                      border: OutlineInputBorder(
                        borderRadius:
                            BorderRadius.circular(AppSpacing.buttonRadius),
                        borderSide: BorderSide(color: AppColors.border),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md,
                        vertical: AppSpacing.sm,
                      ),
                      isDense: true,
                    ),
                    style: AppTextStyles.body,
                    maxLines: 4,
                    minLines: 1,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                IconButton(
                  onPressed: _sending ? null : _sendMessage,
                  icon: Icon(
                    Icons.send_rounded,
                    color: _sending
                        ? AppColors.textSecondary
                        : AppColors.primaryLight,
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
// Typing Indicator Widget
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
    if (newCount != _dotCount) {
      setState(() => _dotCount = newCount);
    }
  }

  @override
  void dispose() {
    _animController.removeListener(_onTick);
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dots = '.' * _dotCount;
    return Text(
      '入力中$dots',
      style: AppTextStyles.caption.copyWith(
        color: AppColors.textSecondary,
      ),
    );
  }
}

// =============================================================================
// Editing Bubble Widget
// =============================================================================

class _EditingBubble extends StatelessWidget {
  const _EditingBubble({
    required this.message,
    required this.controller,
    required this.onSave,
    required this.onCancel,
  });

  final Message message;
  final TextEditingController controller;
  final VoidCallback onSave;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.primaryLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  TextField(
                    controller: controller,
                    autofocus: true,
                    maxLines: 4,
                    minLines: 1,
                    style: AppTextStyles.body,
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
                            color: AppColors.textSecondary,
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
                            color: AppColors.primaryLight,
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
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
    );
  }
}

// =============================================================================
// Message Bubble Widget
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
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        mainAxisAlignment:
            isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: AppColors.primaryLight.withValues(alpha: 0.1),
              child: Text(
                (message.senderName ?? '?')[0],
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.primaryLight,
                  fontWeight: FontWeight.w600,
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
                    padding:
                        const EdgeInsets.only(left: AppSpacing.xs, bottom: 2),
                    child: Text(
                      message.senderName ?? '応募者',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    color: isMe ? AppColors.primaryLight : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isMe ? 16 : 4),
                      bottomRight: Radius.circular(isMe ? 4 : 16),
                    ),
                    boxShadow: isMe
                        ? null
                        : [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                  ),
                  child: Text(
                    message.content,
                    style: AppTextStyles.body.copyWith(
                      color: isMe ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (message.isEdited)
                        Padding(
                          padding: const EdgeInsets.only(right: 4),
                          child: Text(
                            '(編集済み)',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      Text(
                        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
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
