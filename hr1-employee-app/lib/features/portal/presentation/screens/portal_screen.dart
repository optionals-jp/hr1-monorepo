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
import 'widgets/action_chip.dart';
import 'widgets/notice_list_item.dart';

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
            Text(user?.organizationName ?? 'HR1', style: AppTextStyles.bold24.copyWith(letterSpacing: -0.2)),
          ],
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: AppIcons.svg(AppIcons.notification, color: theme.appBarTheme.foregroundColor, size: 22),
            onPressed: () {
              // TODO: 通知画面へ遷移
            },
          ),
          GestureDetector(
            onTap: () => context.push(AppRoutes.profile),
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
                  Text('こんにちは、${user?.displayName ?? 'ゲスト'}さん', style: AppTextStyles.bold24),
                  if (user?.department != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        '${user!.department} / ${user.position ?? ''}',
                        style: AppTextStyles.regular12.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
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
                        icon: AppIcons.svg(AppIcons.clock, size: 24, color: AppColors.brandPrimary),
                        label: '勤怠打刻',
                        color: AppColors.brandPrimary,
                        onTap: () => context.push(AppRoutes.attendance),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.svg(AppIcons.doc, size: 24, color: AppColors.warning),
                        label: '各種申請',
                        color: AppColors.warning,
                        onTap: () {},
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.svg(AppIcons.calendar, size: 24, color: AppColors.success),
                        label: 'スケジュール',
                        color: AppColors.success,
                        onTap: () {},
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.svg(AppIcons.folder, size: 24, color: AppColors.brandSecondary),
                        label: '社内文書',
                        color: AppColors.brandSecondary,
                        onTap: () {},
                      ),
                      const SizedBox(width: AppSpacing.md),
                      PortalActionChip(
                        icon: AppIcons.svg(AppIcons.teacher, size: 24, color: const Color(0xFF8764B8)),
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
                      style: AppTextStyles.regular11.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () {},
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'すべて表示',
                      style: AppTextStyles.regular11.copyWith(color: AppColors.brandPrimary, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // お知らせリスト（フルワイド リストアイテム — Teams スタイル）
          SliverList(
            delegate: SliverChildListDelegate([
              NoticeListItem(title: '年末調整のお知らせ', subtitle: '人事部より', date: '3/1', isNew: true),
              NoticeListItem(title: '社内研修のご案内', subtitle: '総務部より', date: '2/25', isNew: false),
              NoticeListItem(title: '健康診断の日程について', subtitle: '人事部より', date: '2/20', isNew: false),
              const SizedBox(height: AppSpacing.xxl),
            ]),
          ),
        ],
      ),
    );
  }
}
