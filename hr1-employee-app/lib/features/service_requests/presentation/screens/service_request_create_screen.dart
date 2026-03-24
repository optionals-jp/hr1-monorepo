import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/service_requests/domain/entities/service_request.dart';
import 'package:hr1_employee_app/features/service_requests/presentation/controllers/service_request_controller.dart';

class ServiceRequestCreateScreen extends HookConsumerWidget {
  const ServiceRequestCreateScreen({super.key, required this.type});

  final ServiceRequestType type;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final titleController = useTextEditingController();
    final descriptionController = useTextEditingController();
    final formKey = useMemoized(GlobalKey<FormState>.new);

    final controllerState = ref.watch(serviceRequestControllerProvider);
    final isLoading = controllerState is AsyncLoading;

    Future<void> submit() async {
      if (ref.read(serviceRequestControllerProvider) is AsyncLoading) return;
      if (!formKey.currentState!.validate()) return;

      final user = ref.read(appUserProvider);
      if (user == null) return;

      final success = await ref
          .read(serviceRequestControllerProvider.notifier)
          .submit(
            userId: user.id,
            type: type,
            title: titleController.text.trim(),
            description: descriptionController.text.trim(),
          );

      if (!context.mounted) return;
      if (success) {
        CommonSnackBar.show(context, 'リクエストを送信しました');
        context.pop();
      } else {
        CommonSnackBar.error(context, '送信に失敗しました');
      }
    }

    return CommonScaffold(
      appBar: AppBar(title: Text(type.label, style: AppTextStyles.headline)),
      body: Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          children: [
            Text(
              type == ServiceRequestType.bug
                  ? '不具合の内容を教えてください'
                  : 'ご要望の内容を教えてください',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            Text('タイトル', style: AppTextStyles.footnote),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: titleController,
              style: AppTextStyles.body2,
              decoration: InputDecoration(
                hintText: type == ServiceRequestType.bug
                    ? '例: ログインできない'
                    : '例: ダークモードに対応してほしい',
                hintStyle: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'タイトルを入力してください';
                }
                return null;
              },
            ),
            const SizedBox(height: AppSpacing.xl),

            Text('詳細', style: AppTextStyles.footnote),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: descriptionController,
              style: AppTextStyles.body2,
              maxLines: 8,
              minLines: 4,
              decoration: InputDecoration(
                hintText: type == ServiceRequestType.bug
                    ? '発生した状況や手順を詳しく教えてください'
                    : '具体的にどのような機能があると嬉しいですか？',
                hintStyle: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
                alignLabelWithHint: true,
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return '詳細を入力してください';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          child: CommonButton(
            onPressed: submit,
            loading: isLoading,
            child: const Text('送信'),
          ),
        ),
      ),
    );
  }
}
