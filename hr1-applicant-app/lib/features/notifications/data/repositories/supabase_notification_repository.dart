import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/notifications/domain/entities/notification_item.dart';

/// Supabase 通知リポジトリ
class SupabaseNotificationRepository {
  SupabaseNotificationRepository(this._client);

  final SupabaseClient _client;

  String get _userId => _client.auth.currentUser!.id;

  /// 通知一覧を取得（ページネーション対応）
  Future<List<NotificationItem>> getNotifications({
    int limit = 30,
    int offset = 0,
  }) async {
    final data = await _client
        .from('notifications')
        .select()
        .eq('user_id', _userId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);
    return (data as List).map((e) => NotificationItem.fromJson(e)).toList();
  }

  /// 最新の未読通知を取得（ホーム表示用）
  Future<List<NotificationItem>> getLatestUnread({int limit = 3}) async {
    final data = await _client
        .from('notifications')
        .select()
        .eq('user_id', _userId)
        .eq('is_read', false)
        .order('created_at', ascending: false)
        .limit(limit);
    return (data as List).map((e) => NotificationItem.fromJson(e)).toList();
  }

  /// 未読件数を取得
  Future<int> getUnreadCount() async {
    final result = await _client
        .from('notifications')
        .select('id')
        .eq('user_id', _userId)
        .eq('is_read', false)
        .count(CountOption.exact);
    return result.count;
  }

  /// 個別の通知を既読にする
  Future<void> markAsRead(String id) async {
    await _client
        .from('notifications')
        .update({
          'is_read': true,
          'read_at': DateTime.now().toUtc().toIso8601String(),
        })
        .eq('id', id)
        .eq('user_id', _userId);
  }

  /// 全通知を既読にする
  Future<void> markAllAsRead() async {
    await _client.rpc('mark_all_notifications_read');
  }

  /// 通知を削除する
  Future<void> deleteNotification(String id) async {
    await _client
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }
}
