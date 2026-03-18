import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_notification_repository.dart';
import '../../domain/entities/notification_item.dart';

/// リポジトリプロバイダー
final notificationRepositoryProvider = Provider<SupabaseNotificationRepository>(
  (ref) {
    return SupabaseNotificationRepository(Supabase.instance.client);
  },
);

/// 通知一覧（全件）
final allNotificationsProvider = FutureProvider<List<NotificationItem>>((ref) {
  return ref.watch(notificationRepositoryProvider).getNotifications();
});

/// 最新の未読通知（ポータル表示用：最大3件）
final latestNotificationsProvider = FutureProvider<List<NotificationItem>>((
  ref,
) {
  return ref.watch(notificationRepositoryProvider).getLatestUnread(limit: 3);
});

/// 未読件数（バッジ表示用）
final unreadNotificationCountProvider = FutureProvider<int>((ref) {
  return ref.watch(notificationRepositoryProvider).getUnreadCount();
});
