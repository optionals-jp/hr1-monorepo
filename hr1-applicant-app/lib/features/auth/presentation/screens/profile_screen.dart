import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/presentation/controllers/auth_controller.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

/// マイページ画面 — Teams / Outlook 設定画面スタイル
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        // プロフィールヘッダー
        GroupedSection(
          children: [
            MenuRow(
              leading: UserAvatar(
                initial: user?.displayName?.substring(0, 1) ?? '?',
                color: AppColors.brand,
                size: 48,
                imageUrl: user?.avatarUrl,
              ),
              title: user?.displayName ?? '未設定',
              subtitle: user?.email ?? '',
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
              onTap: () => context.push(AppRoutes.profileEdit),
            ),
            MenuRow(
              icon: AppIcons.notification(),
              title: '通知設定',
              showChevron: true,
              onTap: () {},
            ),
            MenuRow(
              icon: AppIcons.setting(),
              title: '設定',
              showChevron: true,
              onTap: () {
                // TODO: 設定画面
              },
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
                          style: AppTextStyles.body2.copyWith(
                            color: AppColors.error,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
                if (confirmed != true) return;
                final success = await ref
                    .read(authControllerProvider.notifier)
                    .signOut();
                if (!context.mounted) return;
                if (success) GoRouter.of(context).go(AppRoutes.login);
              },
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xxxl),
      ],
    );
  }
}
