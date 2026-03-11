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

/// スレッドチャット画面
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

  // Typing indicator state
  bool _otherUserTyping = false;
  Timer? _typingDebounceTimer;
  bool _iAmTyping = false;

  // Edit state
  String? _editingMessageId;
  final _editController = TextEditingController();

  String get _currentUserId =>
      ref.read(appUserProvider)?.id ?? '';

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

  void _onScroll() {
    if (_scrollController.position.pixels <=
            _scrollController.position.minScrollExtent + 50 &&
        !_loadingMore &&
        _hasMore) {
      _loadOlderMessages();
    }
  }

  void _onTextChanged() {
    if (_controller.text.trim().isNotEmpty && !_iAmTyping) {
      _iAmTyping = true;
      _broadcastTyping(true);
    }
    _typingDebounceTimer?.cancel();
    _typingDebounceTimer = Timer(const Duration(seconds: 2), () {
      if (_iAmTyping) {
        _iAmTyping = false;
        _broadcastTyping(false);
      }
    });
  }

  void _broadcastTyping(bool isTyping) {
    _presenceChannel?.track({
      'user_id': _currentUserId,
      'typing': isTyping,
    });
  }

  void _setupPresence() {
    _presenceChannel = Supabase.instance.client
        .channel('typing:${widget.thread.id}')
        .onPresenceSync((payload) {
          if (!mounted) return;
          final presences = _presenceChannel?.presenceState();
          if (presences == null) return;

          bool otherTyping = false;
          for (final state in presences) {
            for (final presence in state.presences) {
              if (presence.payload['user_id'] != _currentUserId &&
                  presence.payload['typing'] == true) {
                otherTyping = true;
                break;
              }
            }
            if (otherTyping) break;
          }

          if (_otherUserTyping != otherTyping) {
            setState(() => _otherUserTyping = otherTyping);
          }
        })
        .subscribe((status, [error]) async {
          if (status == RealtimeSubscribeStatus.subscribed) {
            await _presenceChannel?.track({
              'user_id': _currentUserId,
              'typing': false,
            });
          }
        });
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
      // 未読を既読にする
      repo.markAsRead(widget.thread.id, _currentUserId);
    }
  }

  Future<void> _loadOlderMessages() async {
    if (_messages.isEmpty || _loadingMore || !_hasMore) return;

    setState(() => _loadingMore = true);

    final repo = ref.read(messagesRepositoryProvider);
    final oldestCreatedAt = _messages.first.createdAt;

    // スクロール位置を保持するために現在の位置を記録
    final scrollBefore = _scrollController.position.maxScrollExtent;

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

      // スクロール位置を復元
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          final scrollAfter = _scrollController.position.maxScrollExtent;
          final diff = scrollAfter - scrollBefore;
          _scrollController.jumpTo(_scrollController.offset + diff);
        }
      });
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

            // 送信者情報を取得
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

              // 自分以外のメッセージを自動既読
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
          callback: (payload) async {
            final updated = payload.newRecord;
            if (updated.isEmpty) return;

            // 送信者情報を取得
            final senderResponse = await Supabase.instance.client
                .from('profiles')
                .select('id, display_name, role')
                .eq('id', updated['sender_id'] as String)
                .single();

            final msg = Message.fromJson({
              ...updated,
              'sender': senderResponse,
            });

            if (mounted) {
              setState(() {
                _messages = _messages.map((m) {
                  return m.id == msg.id ? msg : m;
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
            final oldRecord = payload.oldRecord;
            if (oldRecord.isEmpty) return;

            final deletedId = oldRecord['id'] as String?;
            if (deletedId == null) return;

            if (mounted) {
              setState(() {
                _messages = _messages
                    .where((m) => m.id != deletedId)
                    .toList();
              });
            }
          },
        )
        .subscribe();
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

    // タイピング状態をリセット
    _iAmTyping = false;
    _typingDebounceTimer?.cancel();
    _broadcastTyping(false);

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
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('削除', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(message);
              },
            ),
          ],
        ),
      ),
    );
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

  Future<void> _saveEdit(Message message) async {
    final newContent = _editController.text.trim();
    if (newContent.isEmpty || newContent == message.content) {
      _cancelEditing();
      return;
    }

    try {
      final repo = ref.read(messagesRepositoryProvider);
      final updated = await repo.editMessage(message.id, newContent);
      if (mounted) {
        setState(() {
          _messages = _messages.map((m) {
            return m.id == updated.id ? updated : m;
          }).toList();
          _editingMessageId = null;
          _editController.clear();
        });
      }
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

  Future<void> _confirmDelete(Message message) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('メッセージを削除'),
        content: const Text('このメッセージを削除しますか？この操作は取り消せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('削除'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final repo = ref.read(messagesRepositoryProvider);
        await repo.deleteMessage(message.id);
        if (mounted) {
          setState(() {
            _messages = _messages.where((m) => m.id != message.id).toList();
          });
        }
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
  }

  @override
  Widget build(BuildContext context) {
    final displayName = widget.thread.organizationName ?? '企業';

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
          // メッセージ一覧
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
                        itemCount: _messages.length + (_loadingMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          // ローディングインジケータ（先頭）
                          if (_loadingMore && index == 0) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(
                                  vertical: AppSpacing.md),
                              child: Center(
                                child: SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                ),
                              ),
                            );
                          }

                          final msgIndex =
                              _loadingMore ? index - 1 : index;
                          final msg = _messages[msgIndex];
                          final isMe = msg.senderId == _currentUserId;
                          final isEditing = _editingMessageId == msg.id;

                          return GestureDetector(
                            onLongPress:
                                isMe ? () => _showMessageActions(msg) : null,
                            child: _MessageBubble(
                              message: msg,
                              isMe: isMe,
                              isEditing: isEditing,
                              editController: _editController,
                              onSaveEdit: () => _saveEdit(msg),
                              onCancelEdit: _cancelEditing,
                            ),
                          );
                        },
                      ),
          ),

          // タイピングインジケータ
          if (_otherUserTyping)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.xs,
              ),
              alignment: Alignment.centerLeft,
              child: const _TypingIndicator(),
            ),

          // 入力欄
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

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.message,
    required this.isMe,
    this.isEditing = false,
    this.editController,
    this.onSaveEdit,
    this.onCancelEdit,
  });

  final Message message;
  final bool isMe;
  final bool isEditing;
  final TextEditingController? editController;
  final VoidCallback? onSaveEdit;
  final VoidCallback? onCancelEdit;

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
                    padding: const EdgeInsets.only(
                        left: AppSpacing.xs, bottom: 2),
                    child: Text(
                      message.senderName ?? '担当者',
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
                    color: isEditing
                        ? (isMe
                            ? AppColors.primaryLight.withValues(alpha: 0.8)
                            : Colors.white)
                        : (isMe ? AppColors.primaryLight : Colors.white),
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
                  child: isEditing
                      ? _buildEditingContent(context)
                      : Text(
                          message.content,
                          style: AppTextStyles.body.copyWith(
                            color:
                                isMe ? Colors.white : AppColors.textPrimary,
                          ),
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2, left: 4, right: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${message.createdAt.hour.toString().padLeft(2, '0')}:${message.createdAt.minute.toString().padLeft(2, '0')}',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                      if (message.isEdited) ...[
                        const SizedBox(width: 4),
                        Text(
                          '(編集済み)',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                            fontSize: 10,
                          ),
                        ),
                      ],
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

  Widget _buildEditingContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: editController,
          autofocus: true,
          maxLines: null,
          style: AppTextStyles.body.copyWith(
            color: isMe ? Colors.white : AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            isDense: true,
            contentPadding: EdgeInsets.zero,
            border: InputBorder.none,
            hintText: 'メッセージを編集...',
            hintStyle: AppTextStyles.body.copyWith(
              color: isMe
                  ? Colors.white.withValues(alpha: 0.6)
                  : AppColors.textSecondary,
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
                style: AppTextStyles.caption.copyWith(
                  color: isMe
                      ? Colors.white.withValues(alpha: 0.8)
                      : AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            GestureDetector(
              onTap: onSaveEdit,
              child: Text(
                '保存',
                style: AppTextStyles.caption.copyWith(
                  color: isMe ? Colors.white : AppColors.primaryLight,
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

/// タイピングインジケータ（アニメーション付きドット）
class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator> {
  int _dotCount = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 400), (_) {
      if (mounted) {
        setState(() => _dotCount = (_dotCount + 1) % 3);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dots = '.' * (_dotCount + 1);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          '入力中$dots',
          style: AppTextStyles.caption.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
