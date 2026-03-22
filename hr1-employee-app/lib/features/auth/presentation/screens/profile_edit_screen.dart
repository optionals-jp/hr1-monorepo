import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/common_dialog.dart';
import '../../../../shared/widgets/grouped_section.dart';
import '../../../../shared/widgets/menu_row.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../providers/auth_providers.dart';

/// プロフィール編集画面 — Teams 設定画面スタイル
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('プロフィール編集')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
        children: [
          // アバター（タップで変更）
          Center(
            child: GestureDetector(
              onTap: () {
                // TODO: アバター画像の変更
              },
              child: Stack(
                children: [
                  UserAvatar(
                    initial: user?.displayName?.substring(0, 1) ?? '?',
                    color: AppColors.brandPrimary,
                    size: 96,
                    imageUrl: user?.avatarUrl,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.brandPrimary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: theme.scaffoldBackgroundColor,
                          width: 3,
                        ),
                      ),
                      child: const Icon(
                        Icons.camera_alt_rounded,
                        size: 16,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.xxl),

          // 基本情報セクション
          GroupedSection(
            title: '基本情報',
            children: [
              MenuRow(
                icon: AppIcons.user(),
                label: '表示名',
                title: user?.displayName ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '表示名',
                  initialValue: user?.displayName ?? '',
                  onSave: (value) {
                    // TODO: 表示名の更新
                  },
                ),
              ),
              MenuRow(
                icon: AppIcons.sms(),
                label: 'メールアドレス',
                title: user?.email ?? '未設定',
              ),
              MenuRow(
                icon: AppIcons.briefcase(),
                label: '部署',
                title: user?.department ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '部署',
                  initialValue: user?.department ?? '',
                  onSave: (value) {
                    // TODO: 部署の更新
                  },
                ),
              ),
              MenuRow(
                icon: AppIcons.personalcard(),
                label: '役職',
                title: user?.position ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '役職',
                  initialValue: user?.position ?? '',
                  onSave: (value) {
                    // TODO: 役職の更新
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // スキルセクション
          GroupedSection(
            title: 'スキル',
            children: [
              MenuRow(
                icon: Icon(Icons.psychology_outlined),
                label: 'スキル・専門分野',
                title: '編集する',
                onTap: () {
                  context.push(AppRoutes.skillsEdit);
                },
              ),
              MenuRow(
                icon: AppIcons.award(),
                label: '資格・認定',
                title: '編集する',
                onTap: () {
                  context.push(AppRoutes.certificationsEdit);
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // 経歴セクション
          GroupedSection(
            title: '経歴',
            children: [
              MenuRow(
                icon: AppIcons.briefcase(),
                label: 'プロジェクト経歴',
                title: '編集する',
                onTap: () {
                  // TODO: プロジェクト経歴編集画面
                },
              ),
              MenuRow(
                icon: Icon(Icons.swap_horiz_rounded),
                label: '異動歴',
                title: '編集する',
                onTap: () {
                  // TODO: 異動歴編集画面
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Future<void> _showEditDialog({
    required String title,
    required String initialValue,
    required ValueChanged<String> onSave,
  }) async {
    final value = await CommonDialog.input(
      context: context,
      title: title,
      hintText: '$titleを入力',
      initialValue: initialValue,
    );
    if (value != null && value.isNotEmpty) {
      onSave(value);
    }
  }
}
