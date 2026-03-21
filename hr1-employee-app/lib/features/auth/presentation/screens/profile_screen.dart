import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_icons.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_dialog.dart';
import '../../../../shared/widgets/grouped_section.dart';
import '../../../../shared/widgets/menu_row.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../controllers/auth_controller.dart';
import '../providers/auth_providers.dart';

/// マイページ画面 — Teams / Outlook 設定画面スタイル
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return Scaffold(
      appBar: AppBar(title: Text('マイページ', style: AppTextStyles.headline)),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
        children: [
          // プロフィールヘッダー
          GroupedSection(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                ),
                child: Row(
                  children: [
                    UserAvatar(
                      initial: user?.displayName?.substring(0, 1) ?? '?',
                      color: AppColors.brandPrimary,
                      size: 64,
                      imageUrl: user?.avatarUrl,
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.displayName ?? '未設定',
                            style: AppTextStyles.headline,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            user?.email ?? '',
                            style: AppTextStyles.body2.copyWith(
                              color: AppColors.textSecondary(
                                Theme.of(context).brightness,
                              ),
                            ),
                          ),
                          if (user?.department != null)
                            Text(
                              '${user!.department}${user.position != null ? ' / ${user.position}' : ''}',
                              style: AppTextStyles.body2.copyWith(
                                color: AppColors.textSecondary(
                                  Theme.of(context).brightness,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // セクション: アカウント
          GroupedSection(
            title: 'アカウント',
            children: [
              MenuRow(
                icon: AppIcons.user(),
                title: 'プロフィール編集',
                showChevron: true,
                onTap: () {
                  context.push(AppRoutes.profileEdit);
                },
              ),
              MenuRow(
                icon: AppIcons.notification(),
                title: '通知設定',
                showChevron: true,
                onTap: () {},
              ),
              MenuRow(
                icon: Icon(Icons.palette_outlined),
                title: '外観',
                showChevron: true,
                onTap: () {},
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // セクション: サポート
          GroupedSection(
            title: 'サポート',
            children: [
              MenuRow(
                icon: Icon(Icons.support_agent_outlined),
                title: 'サービスリクエスト',
                subtitle: 'バグ報告・機能リクエスト',
                showChevron: true,
                onTap: () => context.push(AppRoutes.serviceRequests),
              ),
              MenuRow(
                icon: Icon(Icons.help_outline_rounded),
                title: 'ヘルプ',
                showChevron: true,
                onTap: () {},
              ),
              MenuRow(
                icon: Icon(Icons.info_outline_rounded),
                title: 'バージョン情報',
                showChevron: true,
                onTap: () {},
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // ログアウト
          GroupedSection(
            children: [
              MenuRow(
                icon: Icon(Icons.logout_rounded),
                title: 'ログアウト',
                isDestructive: true,
                onTap: () async {
                  final confirmed = await CommonDialog.confirm(
                    context: context,
                    title: 'ログアウト',
                    message: 'ログアウトしますか？',
                    confirmLabel: 'ログアウト',
                    isDestructive: true,
                  );
                  if (confirmed) {
                    final success = await ref
                        .read(authControllerProvider.notifier)
                        .signOut();
                    if (success && context.mounted) {
                      context.go(AppRoutes.login);
                    }
                  }
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }
}
