import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/notifications/domain/entities/notification_item.dart';
import 'package:hr1_employee_app/features/notifications/presentation/controllers/notification_controller.dart';
import 'package:hr1_employee_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:hr1_employee_app/features/announcements/domain/entities/announcement.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/action_chip.dart';
import 'package:hr1_employee_app/features/compliance/domain/entities/compliance_alert.dart';
import 'package:hr1_employee_app/features/compliance/presentation/providers/compliance_providers.dart';
import 'package:intl/intl.dart';

/// 社内ポータル画面 — Teams / Outlook モバイルスタイル
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            Text(
              user?.organizationName ?? 'HR1',
              style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
            ),
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
                    AppIcons.notification(
                      color: AppColors.textPrimary(context),
                      size: 22,
                    ),
                    if (count > 0)
                      Positioned(
                        right: -6,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 1,
                          ),
                          decoration: const BoxDecoration(
                            color: AppColors.error,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Center(
                            child: Text(
                              count > 99 ? '99+' : '$count',
                              style: AppTextStyles.caption2.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
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
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
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
                  Text(
                    'こんにちは、${user?.displayName ?? 'ゲスト'}さん',
                    style: AppTextStyles.title1,
                  ),
                  if (user?.department != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${user!.department} / ${user.position ?? ''}',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 横スクロール アクションチップ
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.only(top: AppSpacing.xl),
              child: SingleChildScrollView(
                clipBehavior: Clip.none,
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                  vertical: 4,
                ),
                child: IntrinsicHeight(
                  child: Row(
                    children: [
                      PortalActionChip(
                        icon: AppIcons.clock(size: 24, color: AppColors.brand),
                        label: '勤怠打刻',
                        color: AppColors.brand,
                        onTap: () => context.push(AppRoutes.attendance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.doc(size: 24, color: AppColors.warning),
                        label: '各種申請',
                        color: AppColors.warning,
                        onTap: () => context.push(AppRoutes.workflow),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: Icon(
                          Icons.help_outline_rounded,
                          size: 24,
                          color: AppColors.brandLight,
                        ),
                        label: 'FAQ',
                        color: AppColors.brandLight,
                        onTap: () => context.push(AppRoutes.faq),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.menu_book_rounded,
                          size: 24,
                          color: AppColors.brandSecondary,
                        ),
                        label: '社内Wiki',
                        color: AppColors.brandSecondary,
                        onTap: () => context.push(AppRoutes.wiki),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.calendar(
                          size: 24,
                          color: AppColors.success,
                        ),
                        label: '希望シフト',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.shiftRequest),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.poll_outlined,
                          size: 24,
                          color: AppColors.purple,
                        ),
                        label: 'サーベイ',
                        color: AppColors.purple,
                        onTap: () => context.push(AppRoutes.surveys),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.beach_access_rounded,
                          size: 24,
                          color: AppColors.success,
                        ),
                        label: '有給管理',
                        color: AppColors.success,
                        onTap: () => context.push(AppRoutes.leaveBalance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.receipt_long_rounded,
                          size: 24,
                          color: AppColors.brandSecondary,
                        ),
                        label: '給与明細',
                        color: AppColors.brandSecondary,
                        onTap: () => context.push(AppRoutes.payslips),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.user(size: 24, color: AppColors.brand),
                        label: '社員名簿',
                        color: AppColors.brand,
                        onTap: () => context.push(AppRoutes.employees),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: const Icon(
                          Icons.campaign_outlined,
                          size: 24,
                          color: AppColors.warning,
                        ),
                        label: 'お知らせ',
                        color: AppColors.warning,
                        onTap: () => context.push(AppRoutes.announcements),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // コンプライアンスアラート
          Consumer(
            builder: (context, ref, _) {
              final alertsAsync = ref.watch(myComplianceAlertsProvider);
              return alertsAsync.when(
                loading: () =>
                    const SliverToBoxAdapter(child: SizedBox.shrink()),
                error: (_, __) =>
                    const SliverToBoxAdapter(child: SizedBox.shrink()),
                data: (alerts) {
                  if (alerts.isEmpty) {
                    return const SliverToBoxAdapter(child: SizedBox.shrink());
                  }
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.screenHorizontal,
                        AppSpacing.xxl,
                        AppSpacing.screenHorizontal,
                        0,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: alerts
                            .map((alert) => _ComplianceAlertCard(alert: alert))
                            .toList(),
                      ),
                    ),
                  );
                },
              );
            },
          ),

          // セクションヘッダー: 全社お知らせ
          Consumer(
            builder: (context, ref, _) {
              final pinnedAsync = ref.watch(pinnedAnnouncementsProvider);
              return pinnedAsync.when(
                loading: () =>
                    const SliverToBoxAdapter(child: SizedBox.shrink()),
                error: (_, __) =>
                    const SliverToBoxAdapter(child: SizedBox.shrink()),
                data: (pinned) {
                  if (pinned.isEmpty) {
                    return const SliverToBoxAdapter(child: SizedBox.shrink());
                  }
                  return SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
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
                                  '全社お知らせ',
                                  style: AppTextStyles.caption2.copyWith(
                                    color: AppColors.textSecondary(context),
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                              TextButton(
                                onPressed: () =>
                                    context.push(AppRoutes.announcements),
                                style: TextButton.styleFrom(
                                  padding: EdgeInsets.zero,
                                  minimumSize: Size.zero,
                                  tapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: Text(
                                  'すべて表示',
                                  style: AppTextStyles.caption2.copyWith(
                                    color: AppColors.brand,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        ...pinned.map(
                          (a) => _PinnedAnnouncementTile(announcement: a),
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),

          // セクションヘッダー: 通知
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
                      '通知',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
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
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.brand,
                        fontWeight: FontWeight.w600,
                      ),
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
                loading: () => const SliverToBoxAdapter(
                  child: SizedBox(height: 60, child: LoadingIndicator()),
                ),
                error: (_, __) => SliverToBoxAdapter(
                  child: ErrorState(
                    onRetry: () => ref.invalidate(latestNotificationsProvider),
                  ),
                ),
                data: (notifications) {
                  if (notifications.isEmpty) {
                    return SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.screenHorizontal,
                          vertical: AppSpacing.xl,
                        ),
                        child: Text(
                          '新しい通知はありません',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
                          ),
                        ),
                      ),
                    );
                  }
                  return SliverList(
                    delegate: SliverChildListDelegate([
                      ...notifications.map(
                        (n) => _NotificationPreviewTile(item: n),
                      ),
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

class _PinnedAnnouncementTile extends StatelessWidget {
  const _PinnedAnnouncementTile({required this.announcement});

  final Announcement announcement;

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat(
      'MM/dd',
    ).format(announcement.publishedAt.toLocal());

    return InkWell(
      onTap: () => context.push(AppRoutes.announcements),
      child: Padding(
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
                color: AppColors.warning.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.push_pin,
                size: 20,
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    announcement.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dateStr,
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(context),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ComplianceAlertCard extends StatelessWidget {
  const _ComplianceAlertCard({required this.alert});

  final ComplianceAlert alert;

  @override
  Widget build(BuildContext context) {
    final isCritical = alert.severity == 'critical';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isCritical
            ? AppColors.error.withValues(alpha: 0.08)
            : AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCritical
              ? AppColors.error.withValues(alpha: 0.3)
              : AppColors.warning.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isCritical ? Icons.error_rounded : Icons.warning_amber_rounded,
            size: 20,
            color: isCritical ? AppColors.error : AppColors.warning,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  alert.title,
                  style: AppTextStyles.caption1.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  alert.description,
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
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
    final iconData = item.type.icon;
    final iconColor = item.type.color;

    return InkWell(
      onTap: () {
        if (!item.isRead) {
          ref.read(notificationControllerProvider.notifier).markAsRead(item.id);
        }
        if (item.actionUrl != null && item.actionUrl!.startsWith('/')) {
          context.push(item.actionUrl!);
        }
      },
      child: Padding(
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
                color: !item.isRead
                    ? iconColor.withValues(alpha: 0.1)
                    : AppColors.divider(context),
                shape: BoxShape.circle,
              ),
              child: Icon(
                iconData,
                size: 20,
                color: !item.isRead
                    ? iconColor
                    : AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: !item.isRead
                          ? FontWeight.w600
                          : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.body != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.body!,
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
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
                decoration: const BoxDecoration(
                  color: AppColors.brand,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
