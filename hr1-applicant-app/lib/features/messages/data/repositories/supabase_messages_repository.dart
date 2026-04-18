import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_applicant_app/features/messages/domain/repositories/messages_repository.dart';

/// MessagesRepository の Supabase 実装
class SupabaseMessagesRepository implements MessagesRepository {
  SupabaseMessagesRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<MessageThread>> getThreads(
    String userId, {
    String? organizationId,
  }) async {
    var query = _client
        .from('message_threads')
        .select(
          '*, organizations:organization_id(name), '
          'messages(*, sender:sender_id(id, display_name, role))',
        )
        .eq('participant_id', userId);

    if (organizationId != null) {
      query = query.eq('organization_id', organizationId);
    }

    final response = await query
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
      final org = map.remove('organizations') as Map<String, dynamic>?;
      map['organization_name'] = org?['name'];
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
    // HR-28: thread 参加者チェックを RPC (SECURITY DEFINER) に委譲。
    // `.eq('thread_id', threadId)` だけでは RLS のバイパスが疑わしい場合に
    // 他テナントのメッセージを誤取得するリスクがあるため、
    // get_my_accessible_thread_ids() で検証する get_thread_messages を使う。
    // p_limit は NULL（PostgreSQL の LIMIT NULL = 無制限）。
    final response = await _client.rpc(
      'get_thread_messages',
      params: {'p_thread_id': threadId, 'p_before': null, 'p_limit': null},
    );
    final rows = response as List? ?? [];
    return rows
        .map((row) => Message.fromJson(Map<String, dynamic>.from(row)))
        .toList();
  }

  @override
  Future<List<Message>> getMessagesPaginated(
    String threadId, {
    DateTime? before,
    int limit = 30,
  }) async {
    // HR-28: RPC 経由で thread 参加者チェックを強制する。
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

    // updated_at はDBトリガーで自動更新される

    return Message.fromJson(response);
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
  Future<void> markAsRead(String threadId, String userId) async {
    await _client
        .from('messages')
        .update({'read_at': DateTime.now().toUtc().toIso8601String()})
        .eq('thread_id', threadId)
        .neq('sender_id', userId)
        .isFilter('read_at', null);
  }

  @override
  Future<Map<String, dynamic>> getSenderProfile(String senderId) async {
    return await _client
        .from('profiles')
        .select('id, display_name, role')
        .eq('id', senderId)
        .single();
  }

  @override
  Future<MessageThread> getOrCreateThread({
    required String userId,
    required String organizationId,
  }) async {
    final existing = await _client
        .from('message_threads')
        .select('*, organizations:organization_id(name)')
        .eq('participant_id', userId)
        .eq('organization_id', organizationId)
        .eq('participant_type', 'applicant')
        .maybeSingle();

    if (existing != null) {
      final map = Map<String, dynamic>.from(existing);
      final org = map['organizations'] as Map<String, dynamic>?;
      map['organization_name'] = org?['name'];
      return MessageThread.fromJson(map);
    }

    final response = await _client
        .from('message_threads')
        .insert({
          'participant_id': userId,
          'organization_id': organizationId,
          'participant_type': 'applicant',
        })
        .select('*, organizations:organization_id(name)')
        .single();

    final map = Map<String, dynamic>.from(response);
    final org = map['organizations'] as Map<String, dynamic>?;
    map['organization_name'] = org?['name'];
    return MessageThread.fromJson(map);
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
}
