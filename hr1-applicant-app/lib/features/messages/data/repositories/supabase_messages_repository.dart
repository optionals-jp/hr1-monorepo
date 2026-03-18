import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';

/// MessagesRepository の Supabase 実装
class SupabaseMessagesRepository implements MessagesRepository {
  SupabaseMessagesRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<MessageThread>> getThreads(String userId) async {
    // participant_id で自分のスレッドを取得
    final response = await _client
        .from('message_threads')
        .select('*, organizations:organization_id(name)')
        .eq('participant_id', userId)
        .order('updated_at', ascending: false);

    final threads = (response as List).map((row) {
      final map = Map<String, dynamic>.from(row);
      final org = map['organizations'] as Map<String, dynamic>?;
      map['organization_name'] = org?['name'];
      return MessageThread.fromJson(map);
    }).toList();

    // 各スレッドの最新メッセージと未読数を並列取得
    final enriched = await Future.wait(
      threads.map((thread) async {
        final results = await Future.wait([
          _client
              .from('messages')
              .select('*, sender:sender_id(id, display_name, role)')
              .eq('thread_id', thread.id)
              .order('created_at', ascending: false)
              .limit(1),
          _client
              .from('messages')
              .select('id')
              .eq('thread_id', thread.id)
              .neq('sender_id', userId)
              .isFilter('read_at', null),
        ]);

        final latestList = results[0] as List;
        final Message? latestMessage = latestList.isNotEmpty
            ? Message.fromJson(Map<String, dynamic>.from(latestList.first))
            : null;

        // 未読件数を取得
        final unreadCount = (results[1] as List).length;

        return thread.copyWith(
          latestMessage: latestMessage,
          unreadCount: unreadCount,
        );
      }),
    );

    return enriched;
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

    // 古い順に並べ替えて返す
    return messages.reversed.toList();
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
}
