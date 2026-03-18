import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/org_icon.dart';
import '../../../../shared/widgets/search_box.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../notifications/domain/entities/notification_item.dart';
import '../../../notifications/presentation/providers/notification_providers.dart';
import 'widgets/action_chip.dart';

/// 社内ポータル画面 — Teams / Outlook モバイルスタイル
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(initial: (user?.organizationName ?? 'H').substring(0, 1), size: 32),
            const SizedBox(width: 10),
            Text(user?.organizationName ?? 'HR1', style: AppTextStyles.title1.copyWith(letterSpacing: -0.2)),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: Consumer(
              builder: (context, ref, _) {
                final countAsync = ref.watch(unreadNotificationCountProvider);
                final count = countAsync.valueOrNull ?? 0;
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    AppIcons.notification(color: theme.appBarTheme.foregroundColor, size: 22),
                    if (count > 0)
                      Positioned(
                        right: -6,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                          constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                          child: Center(
                            child: Text(
                              count > 99 ? '99+' : '$count',
                              style: AppTextStyles.caption2.copyWith(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
            onPressed: () => context.push(AppRoutes.notifications),
          ),
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(right: AppSpacing.screenHorizontal),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(0, 1),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // 検索バー（Teams / Outlook 共通パターン）
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
              ),
              child: const SearchBox(),
            ),
          ),

          // 挨拶 + 部署
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.lg,
                AppSpacing.screenHorizontal,
                0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('こんにちは、${user?.displayName ?? 'ゲスト'}さん', style: AppTextStyles.title1),
                  if (user?.department != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${user!.department} / ${user.position ?? ''}',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 横スクロール アクションチップ（Teams スタイル）
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xl),
              child: SingleChildScrollView(
                clipBehavior: Clip.none,
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal, vertical: 4),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      PortalActionChip(
                        icon: AppIcons.clock(size: 24, color: AppColors.brandPrimary),
                        label: '勤怠打刻',
                        color: AppColors.brandPrimary,
                        onTap: () => context.push(AppRoutes.attendance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.doc(size: 24, color: AppColors.warning),
                        label: '各種申請',
                        color: AppColors.warning,
                        onTap: () {},
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: Icon(Icons.help_outline_rounded, size: 24, color: AppColors.brandLight),
                        label: 'FAQ',
                        color: AppColors.brandLight,
                        onTap: () => context.push(AppRoutes.faq),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.calendar(size: 24, color: AppColors.success),
                        label: '希望シフト',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.shiftRequest),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(Icons.poll_outlined, size: 24, color: Color(0xFF8764B8)),
                        label: 'サーベイ',
                        color: const Color(0xFF8764B8),
                        onTap: () => context.push(AppRoutes.surveys),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.folder(size: 24, color: AppColors.brandSecondary),
                        label: '社内文書',
                        color: AppColors.brandSecondary,
                        onTap: () {},
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.teacher(size: 24, color: const Color(0xFF8764B8)),
                        label: '研修',
                        color: const Color(0xFF8764B8),
                        onTap: () {},
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // セクションヘッダー: お知らせ
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.xxl,
                AppSpacing.screenHorizontal,
                AppSpacing.xs,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'お知らせ',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(theme.brightness),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push(AppRoutes.notifications),
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'すべて表示',
                      style: AppTextStyles.caption2.copyWith(color: AppColors.brandPrimary, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // お知らせリスト（ライブ通知データ）
          Consumer(
            builder: (context, ref, _) {
              final notificationsAsync = ref.watch(latestNotificationsProvider);
              return notificationsAsync.when(
                loading: () => const SliverToBoxAdapter(child: SizedBox(height: 60, child: Center(child: CircularProgressIndicator(strokeWidth: 2)))),
                error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
                data: (notifications) {
                  if (notifications.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal, vertical: AppSpacing.xl),
                        child: Text(
                          '新しい通知はありません',
                          style: AppTextStyles.caption1.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.45)),
                        ),
                      ),
                    );
                  }
                  return SliverList(
                    delegate: SliverChildListDelegate([
                      ...notifications.map((n) => _NotificationPreviewTile(item: n)),
                      const SizedBox(height: AppSpacing.xxl),
                    ]),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}

class _NotificationPreviewTile extends ConsumerWidget {
  const _NotificationPreviewTile({required this.item});

  final NotificationItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final iconData = item.type.icon;
    final iconColor = item.type.color;

    return InkWell(
      onTap: () {
        if (!item.isRead) {
          ref.read(notificationRepositoryProvider).markAsRead(item.id);
          ref.invalidate(latestNotificationsProvider);
          ref.invalidate(unreadNotificationCountProvider);
        }
        if (item.actionUrl != null && item.actionUrl!.startsWith('/')) {
          context.push(item.actionUrl!);
        }
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: !item.isRead
                    ? iconColor.withValues(alpha: 0.1)
                    : theme.colorScheme.onSurface.withValues(alpha: 0.06),
                shape: BoxShape.circle,
              ),
              child: Icon(iconData, size: 20, color: !item.isRead ? iconColor : theme.colorScheme.onSurface.withValues(alpha: 0.45)),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: AppTextStyles.caption1.copyWith(fontWeight: !item.isRead ? FontWeight.w600 : FontWeight.w400),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.body != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.body!,
                      style: AppTextStyles.caption2.copyWith(color: AppColors.textSecondary(theme.brightness)),
                      maxLines: 1,
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
                decoration: const BoxDecoration(color: AppColors.brandPrimary, shape: BoxShape.circle),
              ),
          ],
        ),
      ),
    );
  }

}
