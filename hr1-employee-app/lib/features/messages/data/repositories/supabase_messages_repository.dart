import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';

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
        .insert({'thread_id': threadId, 'content': content})
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
}
