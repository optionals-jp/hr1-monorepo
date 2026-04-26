import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:image_picker/image_picker.dart';

/// 名刺スキャン画面
class CardScanScreen extends StatelessWidget {
  const CardScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Future<void> pickImage(ImageSource source) async {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 90,
      );
      if (picked == null) return;

      if (context.mounted) {
        context.push(AppRoutes.bcScanReview, extra: picked.path);
      }
    }

    return CommonScaffold(
      appBar: AppBar(title: const Text('名刺スキャン')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.credit_card,
                      size: 80,
                      color: AppColors.textTertiary(context),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    Text(
                      '名刺を撮影またはギャラリーから選択してください',
                      style: AppTextStyles.body1.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            CommonButton(
              onPressed: () => pickImage(ImageSource.camera),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.camera_alt),
                  SizedBox(width: AppSpacing.xs),
                  Text('カメラで撮影'),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            CommonButton.outline(
              onPressed: () => pickImage(ImageSource.gallery),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.photo_library),
                  SizedBox(width: AppSpacing.xs),
                  Text('ギャラリーから選択'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
