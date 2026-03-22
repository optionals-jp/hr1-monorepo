import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/constants.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/notification_item.dart';
import '../controllers/notification_controller.dart';

/// 通知一覧画面
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final state = ref.watch(notificationControllerProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: Text('通知', style: AppTextStyles.headline),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await ref
                    .read(notificationControllerProvider.notifier)
                    .markAllAsRead();
              } catch (_) {
                CommonSnackBar.error(context, 'エラーが発生しました');
              }
            },
            child: Text(
              'すべて既読',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.brandPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: state.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(notificationControllerProvider),
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcons.notification(
                    size: 48,
                    color: AppColors.textTertiary(theme.brightness),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    '通知はありません',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary(theme.brightness),
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(notificationControllerProvider),
            child: ListView.builder(
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final item = notifications[index];
                return _NotificationTile(
                  item: item,
                  onTap: () {
                    ref
                        .read(notificationControllerProvider.notifier)
                        .markAsRead(item.id);
                    if (item.actionUrl != null &&
                        item.actionUrl!.startsWith('/')) {
                      context.push(item.actionUrl!);
                    }
                  },
                  onDismissed: () {
                    ref
                        .read(notificationControllerProvider.notifier)
                        .deleteNotification(item.id);
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.item,
    required this.onTap,
    required this.onDismissed,
  });

  final NotificationItem item;
  final VoidCallback onTap;
  final VoidCallback onDismissed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final iconData = item.type.icon;
    final iconColor = item.type.color;

    return Dismissible(
      key: ValueKey(item.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismissed(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.error,
        child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
      ),
      child: InkWell(
        onTap: onTap,
        child: Container(
          color: item.isRead
              ? null
              : AppColors.brandPrimary.withValues(alpha: 0.03),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: 14,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(iconData, size: 20, color: iconColor),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: AppTextStyles.caption1.copyWith(
                              fontWeight: item.isRead
                                  ? FontWeight.w400
                                  : FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          _formatDate(item.createdAt),
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.textSecondary(theme.brightness),
                          ),
                        ),
                      ],
                    ),
                    if (item.body != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        item.body!,
                        style: AppTextStyles.caption2.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              if (!item.isRead)
                Container(
                  margin: const EdgeInsets.only(left: AppSpacing.sm, top: 6),
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.brandPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return '今';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分前';
    if (diff.inHours < 24) return '${diff.inHours}時間前';
    if (diff.inDays < 7) return '${diff.inDays}日前';
    return DateFormat('M/d').format(date.toLocal());
  }
}
