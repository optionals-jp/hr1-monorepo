import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

/// 社内ポータル画面
/// お知らせ、勤怠、各種申請などへのエントリーポイント
class PortalScreen extends ConsumerWidget {
  const PortalScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(appUserProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 挨拶
          Text(
            'こんにちは、${user?.displayName ?? 'ゲスト'}さん',
            style: AppTextStyles.heading3,
          ),
          if (user?.department != null)
            Text(
              '${user!.department} / ${user.position ?? ''}',
              style: AppTextStyles.bodySmall.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          const SizedBox(height: AppSpacing.xl),

          // クイックアクション
          Text('クイックアクション', style: AppTextStyles.subtitle),
          const SizedBox(height: AppSpacing.md),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: AppSpacing.md,
            crossAxisSpacing: AppSpacing.md,
            childAspectRatio: 1.5,
            children: [
              _QuickActionCard(
                icon: Icons.access_time,
                label: '勤怠打刻',
                color: AppColors.primaryLight,
                onTap: () {
                  // TODO: 勤怠打刻
                },
              ),
              _QuickActionCard(
                icon: Icons.description_outlined,
                label: '各種申請',
                color: AppColors.accent,
                onTap: () {
                  // TODO: 各種申請
                },
              ),
              _QuickActionCard(
                icon: Icons.calendar_today_outlined,
                label: 'スケジュール',
                color: AppColors.success,
                onTap: () {
                  // TODO: スケジュール
                },
              ),
              _QuickActionCard(
                icon: Icons.folder_outlined,
                label: '社内文書',
                color: AppColors.warning,
                onTap: () {
                  // TODO: 社内文書
                },
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),

          // お知らせ
          Text('お知らせ', style: AppTextStyles.subtitle),
          const SizedBox(height: AppSpacing.md),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Column(
                children: [
                  _NoticeItem(
                    title: '年末調整のお知らせ',
                    date: '2026/03/01',
                    isNew: true,
                  ),
                  const Divider(),
                  _NoticeItem(
                    title: '社内研修のご案内',
                    date: '2026/02/25',
                    isNew: false,
                  ),
                  const Divider(),
                  _NoticeItem(
                    title: '健康診断の日程について',
                    date: '2026/02/20',
                    isNew: false,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// クイックアクションカード
class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
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
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: color),
              const SizedBox(height: AppSpacing.sm),
              Text(label, style: AppTextStyles.body),
            ],
          ),
        ),
      ),
    );
  }
}

/// お知らせアイテム
class _NoticeItem extends StatelessWidget {
  const _NoticeItem({
    required this.title,
    required this.date,
    required this.isNew,
  });

  final String title;
  final String date;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Row(
        children: [
          if (isNew)
            Container(
              margin: const EdgeInsets.only(right: AppSpacing.sm),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 2,
              ),
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                'NEW',
                style: AppTextStyles.caption.copyWith(
                  color: theme.colorScheme.surface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          Expanded(
            child: Text(title, style: AppTextStyles.body),
          ),
          Text(
            date,
            style: AppTextStyles.caption.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
