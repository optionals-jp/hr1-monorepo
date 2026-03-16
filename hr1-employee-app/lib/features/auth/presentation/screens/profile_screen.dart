import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../providers/auth_providers.dart';

/// マイページ画面 — Teams / Outlook 設定画面スタイル
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        // プロフィールヘッダー（Teams プロフィール風）
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
          ),
          child: Row(
            children: [
              // アバター（大）
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.brandPrimary,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    user?.displayName?.substring(0, 1) ?? '?',
                    style: AppTextStyles.heading2.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              // 名前 + メール + 部署
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user?.displayName ?? '未設定',
                      style: AppTextStyles.subtitle,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      user?.email ?? '',
                      style: AppTextStyles.caption.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
                      ),
                    ),
                    if (user?.department != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${user!.department}${user.position != null ? ' / ${user.position}' : ''}',
                        style: AppTextStyles.caption.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.55),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.xxl),

        // セクション: 所属企業
        _SectionHeader(title: '所属企業'),
        _GroupedSection(
          children: [
            _MenuRow(
              leading: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.business_rounded,
                  size: 18,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                ),
              ),
              title: user?.organizationName ?? '未設定',
              subtitle: '社員',
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xxl),

        // セクション: アカウント
        _SectionHeader(title: 'アカウント'),
        _GroupedSection(
          children: [
            _MenuRow(
              icon: Icons.person_outline_rounded,
              title: 'プロフィール編集',
              showChevron: true,
              onTap: () {},
            ),
            _MenuRow(
              icon: Icons.notifications_outlined,
              title: '通知設定',
              showChevron: true,
              onTap: () {},
            ),
            _MenuRow(
              icon: Icons.palette_outlined,
              title: '外観',
              showChevron: true,
              onTap: () {},
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xxl),

        // セクション: サポート
        _SectionHeader(title: 'サポート'),
        _GroupedSection(
          children: [
            _MenuRow(
              icon: Icons.help_outline_rounded,
              title: 'ヘルプ',
              showChevron: true,
              onTap: () {},
            ),
            _MenuRow(
              icon: Icons.info_outline_rounded,
              title: 'バージョン情報',
              showChevron: true,
              onTap: () {},
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xxl),

        // ログアウト
        _GroupedSection(
          children: [
            _MenuRow(
              icon: Icons.logout_rounded,
              title: 'ログアウト',
              isDestructive: true,
              onTap: () async {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('ログアウト'),
                    content: const Text('ログアウトしますか？'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('キャンセル'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: Text(
                          'ログアウト',
                          style: TextStyle(color: AppColors.error),
                        ),
                      ),
                    ],
                  ),
                );
                if (confirmed == true) {
                  await ref.read(authRepositoryProvider).signOut();
                  ref.read(appUserProvider.notifier).clearUser();
                  if (context.mounted) {
                    context.go(AppRoutes.login);
                  }
                }
              },
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }
}

/// セクションヘッダー
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal + 4,
        0,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Text(
        title,
        style: AppTextStyles.caption.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

/// iOS スタイルのグループ化セクション（Teams 設定画面風）
class _GroupedSection extends StatelessWidget {
  const _GroupedSection({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: isDark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
                width: 0.5,
              )
            : null,
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            children[i],
            if (i < children.length - 1)
              Divider(
                height: 0.5,
                indent: 52,
                color: theme.colorScheme.outlineVariant,
              ),
          ],
        ],
      ),
    );
  }
}

/// メニュー行 — Teams 設定リストスタイル
class _MenuRow extends StatelessWidget {
  const _MenuRow({
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.showChevron = false,
    this.isDestructive = false,
    this.onTap,
  });

  final IconData? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final bool showChevron;
  final bool isDestructive;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textColor =
        isDestructive ? AppColors.error : theme.colorScheme.onSurface;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            if (leading != null) ...[
              leading!,
              const SizedBox(width: 14),
            ] else if (icon != null) ...[
              Icon(icon, size: 22, color: textColor),
              const SizedBox(width: 14),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.bodySmall.copyWith(color: textColor),
                  ),
                  if (subtitle != null)
                    Text(
                      subtitle!,
                      style: AppTextStyles.caption.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.55),
                      ),
                    ),
                ],
              ),
            ),
            if (showChevron)
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
          ],
        ),
      ),
    );
  }
}
