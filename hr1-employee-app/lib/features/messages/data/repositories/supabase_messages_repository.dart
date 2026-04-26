import 'dart:async';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_realtime_event.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/features/messages/domain/repositories/message_thread_realtime.dart';
import 'package:hr1_employee_app/features/messages/domain/repositories/messages_repository.dart';

/// MessagesRepository の Supabase 実装（社員向け）
class SupabaseMessagesRepository implements MessagesRepository {
  SupabaseMessagesRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<MessageThread>> getThreads(
    String organizationId,
    String userId,
  ) async {
    // スレッドと最新メッセージを1回のクエリで取得
    final response = await _client
        .from('message_threads')
        .select(
          '*, participant:participant_id(id, email, display_name), '
          'messages(*, sender:sender_id(id, display_name, role))',
        )
        .eq('organization_id', organizationId)
        .eq('participant_id', userId)
        .order('updated_at', ascending: false)
        .order('created_at', referencedTable: 'messages', ascending: false)
        .limit(1, referencedTable: 'messages');

    final rows = response as List;
    if (rows.isEmpty) return [];

    final threadIds = rows.map((row) => row['id'] as String).toList();

    // 未読件数を1回のバッチクエリで取得
    final unreadRows = await _client
        .from('messages')
        .select('thread_id')
        .inFilter('thread_id', threadIds)
        .neq('sender_id', userId)
        .isFilter('read_at', null);

    // thread_id ごとに未読件数を集計
    final unreadMap = <String, int>{};
    for (final row in unreadRows as List) {
      final threadId = row['thread_id'] as String;
      unreadMap[threadId] = (unreadMap[threadId] ?? 0) + 1;
    }

    return rows.map((row) {
      final map = Map<String, dynamic>.from(row);
      final messagesList = map.remove('messages') as List? ?? [];

      final thread = MessageThread.fromJson(map);

      final Message? latestMessage = messagesList.isNotEmpty
          ? Message.fromJson(Map<String, dynamic>.from(messagesList.first))
          : null;

      return thread.copyWith(
        latestMessage: latestMessage,
        unreadCount: unreadMap[thread.id] ?? 0,
      );
    }).toList();
  }

  @override
  Future<List<Message>> getMessages(String threadId) async {
    final response = await _client
        .from('messages')
        .select('*, sender:sender_id(id, display_name, role)')
        .eq('thread_id', threadId)
        .order('created_at', ascending: true);

    return (response as List)
        .map((row) => Message.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  @override
  Future<Message> sendMessage({
    required String threadId,
    required String senderId,
    required String content,
  }) async {
    final response = await _client
        .from('messages')
        .insert({
          'thread_id': threadId,
          'sender_id': senderId,
          'content': content,
        })
        .select('*, sender:sender_id(id, display_name, role)')
        .single();

    return Message.fromJson(response);
  }

  @override
  Future<void> markAsRead(String threadId, String userId) async {
    await _client
        .from('messages')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('thread_id', threadId)
        .neq('sender_id', userId)
        .isFilter('read_at', null);
  }

  @override
  Future<List<Message>> getMessagesPaginated(
    String threadId, {
    DateTime? before,
    int limit = 30,
  }) async {
    var query = _client
        .from('messages')
        .select('*, sender:sender_id(id, display_name, role)')
        .eq('thread_id', threadId);

    if (before != null) {
      query = query.lt('created_at', before.toUtc().toIso8601String());
    }

    final response = await query
        .order('created_at', ascending: false)
        .limit(limit);

    final messages = (response as List)
        .map((row) => Message.fromJson(Map<String, dynamic>.from(row)))
        .toList();

    // 古い順に返す（表示用）
    return messages.reversed.toList();
  }

  @override
  Future<Message> editMessage(String messageId, String content) async {
    final response = await _client
        .from('messages')
        .update({
          'content': content,
          'edited_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', messageId)
        .select('*, sender:sender_id(id, display_name, role)')
        .single();

    return Message.fromJson(response);
  }

  @override
  Future<void> deleteMessage(String messageId) async {
    await _client.from('messages').delete().eq('id', messageId);
  }

  @override
  Future<Map<String, dynamic>> getSenderProfile(String senderId) async {
    return _client
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', senderId)
        .single();
  }

  // --- 製品レベル機能 (HR-27) ---

  @override
  Future<List<Message>> getThreadMessagesV2(
    String threadId, {
    DateTime? before,
    int limit = 30,
  }) async {
    final response = await _client.rpc(
      'get_thread_messages',
      params: {
        'p_thread_id': threadId,
        'p_before': before?.toUtc().toIso8601String(),
        'p_limit': limit,
      },
    );
    final rows = response as List? ?? [];
    return rows
        .map((row) => Message.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  @override
  Future<String> sendMessageV2({
    required String threadId,
    required String content,
    String? parentMessageId,
    List<String>? mentionedUserIds,
    List<Map<String, dynamic>>? attachments,
  }) async {
    final response = await _client.rpc(
      'send_message_v2',
      params: {
        'p_thread_id': threadId,
        'p_content': content,
        'p_parent_message_id': parentMessageId,
        'p_mentioned_user_ids': mentionedUserIds,
        'p_attachments': attachments,
      },
    );
    final rows = response as List? ?? [];
    if (rows.isEmpty) {
      throw Exception('send_message_v2 returned no rows');
    }
    final row = Map<String, dynamic>.from(rows.first as Map);
    return row['id'] as String;
  }

  @override
  Future<void> markThreadRead(String threadId) async {
    await _client.rpc('mark_thread_read', params: {'p_thread_id': threadId});
  }

  @override
  Future<String> toggleMessageReaction(String messageId, String emoji) async {
    final response = await _client.rpc(
      'toggle_message_reaction',
      params: {'p_message_id': messageId, 'p_emoji': emoji},
    );
    final rows = response as List? ?? [];
    if (rows.isEmpty) return 'noop';
    final row = Map<String, dynamic>.from(rows.first as Map);
    return row['action'] as String;
  }

  @override
  Future<String> uploadAttachment({
    required String organizationId,
    required String threadId,
    required String messageId,
    required List<int> bytes,
    required String fileName,
    required String mimeType,
  }) async {
    final safeName = fileName.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final path =
        '$organizationId/$threadId/$messageId/${DateTime.now().millisecondsSinceEpoch}_$safeName';
    await _client.storage
        .from('message-attachments')
        .uploadBinary(
          path,
          Uint8List.fromList(bytes),
          fileOptions: FileOptions(contentType: mimeType, upsert: false),
        );
    return path;
  }

  @override
  Future<String> createSignedAttachmentUrl(
    String storagePath, {
    int expiresInSeconds = 3600,
  }) async {
    return _client.storage
        .from('message-attachments')
        .createSignedUrl(storagePath, expiresInSeconds);
  }

  @override
  Future<void> softDeleteMessage(String messageId) async {
    await _client
        .from('messages')
        .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
        .eq('id', messageId);
  }

  @override
  Stream<void> watchAllThreadMessages() {
    final controller = StreamController<void>.broadcast();
    final channel = _client
        .channel('message_threads_realtime')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'messages',
          callback: (_) => controller.add(null),
        )
        .subscribe();
    controller.onCancel = () async {
      await _client.removeChannel(channel);
      await controller.close();
    };
    return controller.stream;
  }

  @override
  MessageThreadRealtime openThreadRealtime({
    required String threadId,
    required String currentUserId,
  }) {
    return _SupabaseMessageThreadRealtime(
      client: _client,
      threadId: threadId,
      currentUserId: currentUserId,
    );
  }
}

/// MessageThreadRealtime の Supabase 実装。
///
/// PostgresChanges（INSERT/UPDATE）と Presence（タイピング）を
/// 1 つの Stream に統合して配信する。チャネル lifecycle は本クラスが所有。
class _SupabaseMessageThreadRealtime implements MessageThreadRealtime {
  _SupabaseMessageThreadRealtime({
    required SupabaseClient client,
    required String threadId,
    required String currentUserId,
  }) : _client = client,
       _threadId = threadId,
       _currentUserId = currentUserId {
    _start();
  }

  final SupabaseClient _client;
  final String _threadId;
  final String _currentUserId;

  final StreamController<MessageRealtimeEvent> _controller =
      StreamController<MessageRealtimeEvent>.broadcast();
  RealtimeChannel? _messagesChannel;
  RealtimeChannel? _presenceChannel;
  bool _presenceSubscribed = false;

  @override
  Stream<MessageRealtimeEvent> get events => _controller.stream;

  void _start() {
    _messagesChannel = _client
        .channel(MessagesChannels.messages(_threadId))
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: _threadId,
          ),
          callback: (payload) {
            final newMsg = payload.newRecord;
            if (newMsg.isEmpty) return;
            _controller.add(
              MessageInserted(
                messageId: newMsg['id'] as String,
                senderId: newMsg['sender_id'] as String?,
              ),
            );
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'thread_id',
            value: _threadId,
          ),
          callback: (payload) {
            final updated = payload.newRecord;
            if (updated.isEmpty) return;
            final messageId = updated['id'] as String;
            if (updated['deleted_at'] != null) {
              _controller.add(
                MessageSoftDeleted(
                  messageId: messageId,
                  deletedAt: DateTime.parse(updated['deleted_at'] as String),
                ),
              );
              return;
            }
            _controller.add(
              MessageEdited(
                messageId: messageId,
                content: updated['content'] as String?,
                editedAt: updated['edited_at'] != null
                    ? DateTime.parse(updated['edited_at'] as String)
                    : null,
              ),
            );
            // updated_at bump によるリアクション・添付の派生変更にも追従するため
            // refresh も併発する。
            _controller.add(const MessageRefreshNeeded());
          },
        )
        .subscribe();

    _presenceChannel = _client
        .channel(MessagesChannels.typing(_threadId))
        .onPresenceSync((_) {
          final presences = _presenceChannel!.presenceState();
          var otherTyping = false;
          for (final s in presences) {
            for (final presence in s.presences) {
              if (presence.payload[MessagesChannels.payloadUserId] !=
                      _currentUserId &&
                  presence.payload[MessagesChannels.payloadIsTyping] == true) {
                otherTyping = true;
                break;
              }
            }
            if (otherTyping) break;
          }
          _controller.add(TypingStateChanged(otherUserTyping: otherTyping));
        })
        .subscribe((status, [error]) async {
          if (status == RealtimeSubscribeStatus.subscribed) {
            _presenceSubscribed = true;
            await _presenceChannel!.track({
              MessagesChannels.payloadUserId: _currentUserId,
              MessagesChannels.payloadIsTyping: false,
            });
          }
        });
  }

  @override
  Future<void> updateTyping({required bool isTyping}) async {
    // subscribed 状態に達する前の `track` は realtime-dart 側で例外になる。
    // 入力タイミングと subscribe の競合に備えて未subscribe時は no-op。
    if (!_presenceSubscribed) return;
    await _presenceChannel?.track({
      MessagesChannels.payloadUserId: _currentUserId,
      MessagesChannels.payloadIsTyping: isTyping,
    });
  }

  @override
  Future<void> dispose() async {
    if (_messagesChannel != null) {
      await _client.removeChannel(_messagesChannel!);
      _messagesChannel = null;
    }
    if (_presenceChannel != null) {
      await _client.removeChannel(_presenceChannel!);
      _presenceChannel = null;
      _presenceSubscribed = false;
    }
    await _controller.close();
  }
}
