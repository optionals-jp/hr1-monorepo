import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart' show FieldEditScreen;
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/auth/presentation/controllers/profile_edit_controller.dart';

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

    return CommonScaffold(
      appBar: AppBar(title: const Text('プロフィール編集')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
        children: [
          Center(
            child: GestureDetector(
              onTap: () => _pickAndUploadAvatar(),
              child: Stack(
                children: [
                  UserAvatar(
                    initial: user?.displayName?.substring(0, 1) ?? '?',
                    color: AppColors.brand,
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
                        color: AppColors.brand,
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

          GroupedSection(
            title: '基本情報',
            children: [
              MenuRow(
                icon: AppIcons.user(),
                label: '表示名',
                title: user?.displayName ?? '未設定',
                onTap: () => _editField(
                  title: '表示名',
                  initialValue: user?.displayName ?? '',
                  fieldKey: 'display_name',
                  successMessage: '表示名を更新しました',
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
                onTap: () => _editField(
                  title: '部署',
                  initialValue: user?.department ?? '',
                  fieldKey: 'department',
                  successMessage: '部署を更新しました',
                ),
              ),
              MenuRow(
                icon: AppIcons.personalcard(),
                label: '役職',
                title: user?.position ?? '未設定',
                onTap: () => _editField(
                  title: '役職',
                  initialValue: user?.position ?? '',
                  fieldKey: 'position',
                  successMessage: '役職を更新しました',
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

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

          GroupedSection(
            title: '経歴',
            children: [
              MenuRow(
                icon: AppIcons.briefcase(),
                label: 'プロジェクト経歴',
                title: '編集する',
                onTap: () {
                  CommonSnackBar.show(context, 'この機能は準備中です');
                },
              ),
              MenuRow(
                icon: Icon(Icons.swap_horiz_rounded),
                label: '異動歴',
                title: '編集する',
                onTap: () {
                  CommonSnackBar.show(context, 'この機能は準備中です');
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('カメラ'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('ギャラリー'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final picked = await picker.pickImage(
      source: source,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 80,
    );
    if (picked == null) return;

    final controller = ref.read(profileEditControllerProvider.notifier);
    final success = await controller.uploadAvatar(picked.path);

    if (mounted) {
      if (success) {
        CommonSnackBar.show(context, 'プロフィール画像を更新しました');
      } else {
        CommonSnackBar.error(context, '画像のアップロードに失敗しました');
      }
    }
  }

  Future<void> _editField({
    required String title,
    required String initialValue,
    required String fieldKey,
    required String successMessage,
  }) async {
    final value = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => FieldEditScreen(
          title: title,
          initialValue: initialValue,
          maxLength: 50,
        ),
      ),
    );
    if (value == null || value.isEmpty) return;

    final controller = ref.read(profileEditControllerProvider.notifier);
    final success = await controller.updateField({fieldKey: value});

    if (mounted) {
      if (success) {
        CommonSnackBar.show(context, successMessage);
      } else {
        CommonSnackBar.error(context, '更新に失敗しました');
      }
    }
  }
}
