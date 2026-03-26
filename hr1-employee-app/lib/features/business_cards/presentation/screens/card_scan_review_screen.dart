import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/controllers/card_scan_controller.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 名刺情報の確認・手動入力画面
///
/// [imagePath] が渡された場合は撮影画像を表示する。
/// いずれの場合も手動で情報を入力・編集して登録できる。
class CardScanReviewScreen extends HookConsumerWidget {
  const CardScanReviewScreen({super.key, this.imagePath});

  final String? imagePath;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasImage = imagePath != null && imagePath!.isNotEmpty;
    final isSaving = useState(false);

    // フォームコントローラー
    final companyNameCtl = useTextEditingController();
    final companyNameKanaCtl = useTextEditingController();
    final corporateNumberCtl = useTextEditingController();
    final departmentCtl = useTextEditingController();
    final positionCtl = useTextEditingController();
    final lastNameCtl = useTextEditingController();
    final firstNameCtl = useTextEditingController();
    final lastNameKanaCtl = useTextEditingController();
    final firstNameKanaCtl = useTextEditingController();
    final emailCtl = useTextEditingController();
    final phoneCtl = useTextEditingController();
    final mobilePhoneCtl = useTextEditingController();
    final postalCodeCtl = useTextEditingController();
    final addressCtl = useTextEditingController();
    final websiteCtl = useTextEditingController();

    Future<void> save() async {
      if (lastNameCtl.text.trim().isEmpty) {
        CommonSnackBar.error(context, '姓は必須です');
        return;
      }

      isSaving.value = true;
      try {
        // 画像がある場合はアップロード
        String imageUrl = '';
        if (hasImage) {
          final repo = ref.read(bcRepositoryProvider);
          imageUrl = await repo.uploadCardImage(imagePath!);
        }

        final controller = ref.read(cardScanControllerProvider.notifier);
        final result = await controller.saveContact(
          imageUrl: imageUrl,
          companyName: companyNameCtl.text.trim(),
          companyNameKana: companyNameKanaCtl.text.trim(),
          corporateNumber: corporateNumberCtl.text.trim(),
          companyPostalCode: postalCodeCtl.text.trim(),
          companyAddress: addressCtl.text.trim(),
          companyPhone: phoneCtl.text.trim(),
          companyWebsite: websiteCtl.text.trim(),
          lastName: lastNameCtl.text.trim(),
          firstName: firstNameCtl.text.trim(),
          lastNameKana: lastNameKanaCtl.text.trim(),
          firstNameKana: firstNameKanaCtl.text.trim(),
          department: departmentCtl.text.trim(),
          position: positionCtl.text.trim(),
          email: emailCtl.text.trim(),
          phone: phoneCtl.text.trim(),
          mobilePhone: mobilePhoneCtl.text.trim(),
        );

        if (context.mounted && result != null) {
          CommonSnackBar.show(context, '連絡先を登録しました');
          ref.invalidate(bcContactsProvider);
          ref.invalidate(bcCompaniesProvider);
          if (hasImage) {
            // スキャン画面まで戻る
            context.pop();
            context.pop();
          } else {
            context.pop();
          }
        }
      } catch (e) {
        if (context.mounted) {
          CommonSnackBar.error(context, '保存に失敗しました');
        }
      } finally {
        isSaving.value = false;
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(hasImage ? '名刺情報を入力' : '連絡先を登録')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 撮影画像プレビュー
            if (hasImage) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.cornerRadius120),
                child: Image.file(
                  File(imagePath!),
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
            ],

            // 会社情報セクション
            _SectionHeader(title: '会社情報', icon: Icons.business),
            const SizedBox(height: AppSpacing.sm),
            _FormField(controller: companyNameCtl, label: '会社名'),
            _FormField(controller: companyNameKanaCtl, label: '会社名（カナ）'),
            _FormField(
              controller: corporateNumberCtl,
              label: '法人番号',
              keyboardType: TextInputType.number,
            ),
            _FormField(controller: postalCodeCtl, label: '郵便番号'),
            _FormField(controller: addressCtl, label: '住所'),
            _FormField(controller: websiteCtl, label: 'Webサイト'),

            const SizedBox(height: AppSpacing.lg),

            // 個人情報セクション
            _SectionHeader(title: '個人情報', icon: Icons.person),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _FormField(controller: lastNameCtl, label: '姓 *'),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _FormField(controller: firstNameCtl, label: '名'),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: _FormField(
                    controller: lastNameKanaCtl,
                    label: '姓（カナ）',
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _FormField(
                    controller: firstNameKanaCtl,
                    label: '名（カナ）',
                  ),
                ),
              ],
            ),
            _FormField(controller: departmentCtl, label: '部署'),
            _FormField(controller: positionCtl, label: '役職'),

            const SizedBox(height: AppSpacing.lg),

            // 連絡先セクション
            _SectionHeader(title: '連絡先', icon: Icons.phone),
            const SizedBox(height: AppSpacing.sm),
            _FormField(
              controller: emailCtl,
              label: 'メールアドレス',
              keyboardType: TextInputType.emailAddress,
            ),
            _FormField(
              controller: phoneCtl,
              label: '電話番号',
              keyboardType: TextInputType.phone,
            ),
            _FormField(
              controller: mobilePhoneCtl,
              label: '携帯電話',
              keyboardType: TextInputType.phone,
            ),

            const SizedBox(height: AppSpacing.xxl),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: CommonButton(
            onPressed: isSaving.value ? null : save,
            child: Text(isSaving.value ? '保存中...' : '保存'),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.icon});

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.brand),
        const SizedBox(width: AppSpacing.xs),
        Text(title, style: AppTextStyles.headline),
      ],
    );
  }
}

class _FormField extends StatelessWidget {
  const _FormField({
    required this.controller,
    required this.label,
    this.keyboardType,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          isDense: true,
        ),
      ),
    );
  }
}
