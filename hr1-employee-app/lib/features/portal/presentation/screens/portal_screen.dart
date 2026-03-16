import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

/// 社内ポータル画面 — Teams / Outlook モバイルスタイル
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return CustomScrollView(
      slivers: [
        // 検索バー（Teams / Outlook 共通パターン）
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.md,
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
            ),
            child: GestureDetector(
              onTap: () {
                // TODO: 検索画面へ遷移
              },
              child: Container(
                height: 40,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: theme.brightness == Brightness.dark
                      ? theme.colorScheme.surfaceContainerHighest
                      : const Color(0xFFEFEFEF),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '検索',
                      style: AppTextStyles.bodySmall.copyWith(
                        color:
                            theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ),
            ),
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
                  style: AppTextStyles.heading2,
                ),
                if (user?.department != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '${user!.department} / ${user.position ?? ''}',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
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
            child: SizedBox(
              height: 88,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal),
                children: [
                  _ActionChip(
                    icon: Icons.access_time_rounded,
                    label: '勤怠打刻',
                    color: AppColors.brandPrimary,
                    onTap: () => context.push(AppRoutes.attendance),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _ActionChip(
                    icon: Icons.description_outlined,
                    label: '各種申請',
                    color: AppColors.warning,
                    onTap: () {},
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _ActionChip(
                    icon: Icons.calendar_today_rounded,
                    label: 'スケジュール',
                    color: AppColors.success,
                    onTap: () {},
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _ActionChip(
                    icon: Icons.folder_outlined,
                    label: '社内文書',
                    color: AppColors.brandSecondary,
                    onTap: () {},
                  ),
                  const SizedBox(width: AppSpacing.md),
                  _ActionChip(
                    icon: Icons.school_outlined,
                    label: '研修',
                    color: const Color(0xFF8764B8),
                    onTap: () {},
                  ),
                ],
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
                    style: AppTextStyles.caption.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.55),
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
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.brandPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // お知らせリスト（フルワイド リストアイテム — Teams スタイル）
        SliverList(
          delegate: SliverChildListDelegate([
            _NoticeListItem(
              title: '年末調整のお知らせ',
              subtitle: '人事部より',
              date: '3/1',
              isNew: true,
            ),
            _NoticeListItem(
              title: '社内研修のご案内',
              subtitle: '総務部より',
              date: '2/25',
              isNew: false,
            ),
            _NoticeListItem(
              title: '健康診断の日程について',
              subtitle: '人事部より',
              date: '2/20',
              isNew: false,
            ),
            const SizedBox(height: AppSpacing.xxl),
          ]),
        ),
      ],
    );
  }
}

/// 横スクロール アクションチップ — Teams モバイルの提案アクション風
class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 24, color: color),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: AppTextStyles.label.copyWith(
                color: theme.colorScheme.onSurface,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

/// お知らせリストアイテム — Teams アクティビティフィードスタイル
class _NoticeListItem extends StatelessWidget {
  const _NoticeListItem({
    required this.title,
    required this.subtitle,
    required this.date,
    required this.isNew,
  });

  final String title;
  final String subtitle;
  final String date;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 14,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // アイコン（Teams のアクティビティアイコン風）
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isNew
                    ? AppColors.brandPrimary.withValues(alpha: 0.1)
                    : theme.colorScheme.onSurface.withValues(alpha: 0.06),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.campaign_outlined,
                size: 20,
                color: isNew
                    ? AppColors.brandPrimary
                    : theme.colorScheme.onSurface.withValues(alpha: 0.45),
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            // コンテンツ
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: AppTextStyles.bodySmall.copyWith(
                            fontWeight:
                                isNew ? FontWeight.w600 : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        date,
                        style: AppTextStyles.caption.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.45),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTextStyles.caption.copyWith(
                      color:
                          theme.colorScheme.onSurface.withValues(alpha: 0.55),
                    ),
                  ),
                ],
              ),
            ),
            // 未読ドット
            if (isNew)
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
    );
  }
}
