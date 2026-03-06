import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../providers/auth_providers.dart';

/// マイページ画面
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xl),

          // アバター
          CircleAvatar(
            radius: AppSpacing.avatarLg / 2,
            backgroundColor: AppColors.primary,
            child: Text(
              user?.displayName?.substring(0, 1) ?? '?',
              style: AppTextStyles.heading2.copyWith(
                color: AppColors.surface,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // 名前
          Text(
            user?.displayName ?? '未設定',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: AppSpacing.xs),

          // メール
          Text(
            user?.email ?? '',
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: AppSpacing.sm),

          // 応募者バッジ
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: AppColors.accent.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
            ),
            child: Text(
              '応募者',
              style: AppTextStyles.label.copyWith(
                color: AppColors.accent,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // メニュー
          Card(
            child: Column(
              children: [
                _ProfileMenuItem(
                  icon: Icons.person_outline,
                  label: 'プロフィール編集',
                  onTap: () {
                    // TODO: プロフィール編集
                  },
                ),
                const Divider(height: 1),
                _ProfileMenuItem(
                  icon: Icons.settings_outlined,
                  label: '設定',
                  onTap: () {
                    // TODO: 設定画面
                  },
                ),
                const Divider(height: 1),
                _ProfileMenuItem(
                  icon: Icons.help_outline,
                  label: 'ヘルプ',
                  onTap: () {
                    // TODO: ヘルプ画面
                  },
                ),
                const Divider(height: 1),
                _ProfileMenuItem(
                  icon: Icons.logout,
                  label: 'ログアウト',
                  isDestructive: true,
                  onTap: () {
                    // TODO: ログアウト処理
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// プロフィールメニューアイテム
class _ProfileMenuItem extends StatelessWidget {
  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? AppColors.error : AppColors.textPrimary;

    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(
        label,
        style: AppTextStyles.body.copyWith(color: color),
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.textSecondary,
      ),
      onTap: onTap,
    );
  }
}
