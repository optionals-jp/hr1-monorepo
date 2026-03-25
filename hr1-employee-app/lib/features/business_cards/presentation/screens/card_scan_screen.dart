import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/card_scan_controller.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:image_picker/image_picker.dart';

/// 名刺スキャン画面
class CardScanScreen extends HookConsumerWidget {
  const CardScanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isProcessing = useState(false);
    final capturedImage = useState<File?>(null);

    Future<void> pickAndScan(ImageSource source) async {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 90,
      );
      if (picked == null) return;

      isProcessing.value = true;
      capturedImage.value = File(picked.path);

      try {
        // ML Kit でOCR
        final textRecognizer = TextRecognizer(
          script: TextRecognitionScript.japanese,
        );
        final inputImage = InputImage.fromFilePath(picked.path);
        final recognizedText = await textRecognizer.processImage(inputImage);
        await textRecognizer.close();

        final ocrText = recognizedText.text;

        if (ocrText.isEmpty) {
          if (context.mounted) {
            CommonSnackBar.error(context, 'テキストを読み取れませんでした');
          }
          isProcessing.value = false;
          return;
        }

        // Edge Function で構造化解析
        final controller = ref.read(cardScanControllerProvider.notifier);
        await controller.processCard(picked.path, ocrText);

        if (context.mounted) {
          final scanState = ref.read(cardScanControllerProvider);
          if (scanState.hasValue && scanState.value != null) {
            context.push(AppRoutes.bcScanReview);
          } else if (scanState.hasError) {
            CommonSnackBar.error(context, '名刺の解析に失敗しました');
          }
        }
      } catch (e) {
        if (context.mounted) {
          CommonSnackBar.error(context, '名刺の読み取りに失敗しました');
        }
      } finally {
        isProcessing.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('名刺スキャン'),
      ),
      body: isProcessing.value
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  LoadingIndicator(),
                  SizedBox(height: AppSpacing.md),
                  Text('名刺を読み取り中...'),
                ],
              ),
            )
          : Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Column(
                children: [
                  if (capturedImage.value != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Image.file(
                        capturedImage.value!,
                        height: 200,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                  ],
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
                    onPressed: () => pickAndScan(ImageSource.camera),
                    label: 'カメラで撮影',
                    icon: Icons.camera_alt,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  CommonButton.outline(
                    onPressed: () => pickAndScan(ImageSource.gallery),
                    label: 'ギャラリーから選択',
                    icon: Icons.photo_library,
                  ),
                ],
              ),
            ),
    );
  }
}
