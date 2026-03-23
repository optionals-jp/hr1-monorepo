import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_shared/hr1_shared.dart' show FieldEditScreen;
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/presentation/controllers/profile_edit_controller.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

/// プロフィール編集画面
class ProfileEditScreen extends ConsumerWidget {
  const ProfileEditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return CommonScaffold(
      appBar: AppBar(title: const Text('プロフィール編集')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
        children: [
          // アバター
          Center(
            child: GestureDetector(
              onTap: () => _pickAndUploadAvatar(context, ref),
              child: Stack(
                children: [
                  UserAvatar(
                    initial: user?.displayName?.substring(0, 1) ?? '?',
                    color: AppColors.primaryLight,
                    size: 64,
                    imageUrl: user?.avatarUrl,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: theme.scaffoldBackgroundColor,
                          width: 2,
                        ),
                      ),
                      child: const Icon(
                        Icons.camera_alt_rounded,
                        size: 12,
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
                onTap: () =>
                    _editDisplayName(context, ref, user?.displayName ?? ''),
              ),
              MenuRow(
                icon: Icon(Icons.mail_outline_rounded),
                label: 'メールアドレス',
                title: user?.email ?? '未設定',
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Future<void> _pickAndUploadAvatar(BuildContext context, WidgetRef ref) async {
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

    final file = File(picked.path);
    final ext = picked.path.split('.').last;

    final success = await ref
        .read(profileEditControllerProvider.notifier)
        .uploadAvatar(file, ext);

    if (!context.mounted) return;
    if (success) {
      CommonSnackBar.show(context, 'プロフィール画像を更新しました');
    } else {
      CommonSnackBar.error(context, '画像のアップロードに失敗しました');
    }
  }

  Future<void> _editDisplayName(
    BuildContext context,
    WidgetRef ref,
    String currentName,
  ) async {
    final value = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => FieldEditScreen(
          title: '表示名',
          initialValue: currentName,
          maxLength: 50,
        ),
      ),
    );
    if (value == null || value.isEmpty) return;
    if (!context.mounted) return;

    final success = await ref
        .read(profileEditControllerProvider.notifier)
        .updateDisplayName(value);

    if (!context.mounted) return;
    if (success) {
      CommonSnackBar.show(context, '表示名を更新しました');
    } else {
      CommonSnackBar.error(context, '表示名の更新に失敗しました');
    }
  }
}
