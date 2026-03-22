import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/notification_item.dart';
import '../providers/notification_providers.dart';

/// 通知コントローラー
class NotificationController
    extends AutoDisposeAsyncNotifier<List<NotificationItem>> {
  @override
  Future<List<NotificationItem>> build() {
    return ref.watch(notificationRepositoryProvider).getNotifications();
  }

  Future<void> markAsRead(String id) async {
    await ref.read(notificationRepositoryProvider).markAsRead(id);
    ref.invalidate(allNotificationsProvider);
    ref.invalidate(latestNotificationsProvider);
    ref.invalidate(unreadNotificationCountProvider);
    ref.invalidateSelf();
  }

  Future<void> markAllAsRead() async {
    await ref.read(notificationRepositoryProvider).markAllAsRead();
    ref.invalidate(allNotificationsProvider);
    ref.invalidate(latestNotificationsProvider);
    ref.invalidate(unreadNotificationCountProvider);
    ref.invalidateSelf();
  }

  Future<void> deleteNotification(String id) async {
    await ref.read(notificationRepositoryProvider).deleteNotification(id);
    ref.invalidate(allNotificationsProvider);
    ref.invalidate(latestNotificationsProvider);
    ref.invalidate(unreadNotificationCountProvider);
    ref.invalidateSelf();
  }
}

final notificationControllerProvider =
    AutoDisposeAsyncNotifierProvider<
      NotificationController,
      List<NotificationItem>
    >(NotificationController.new);
