import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/features/service_requests/domain/entities/service_request.dart';
import 'package:hr1_applicant_app/features/service_requests/presentation/controllers/service_request_controller.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';

/// サービスリクエスト作成画面
class ServiceRequestCreateScreen extends ConsumerStatefulWidget {
  const ServiceRequestCreateScreen({super.key, required this.type});

  final ServiceRequestType type;

  @override
  ConsumerState<ServiceRequestCreateScreen> createState() =>
      _ServiceRequestCreateScreenState();
}

class _ServiceRequestCreateScreenState
    extends ConsumerState<ServiceRequestCreateScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (ref.read(serviceRequestControllerProvider) is AsyncLoading) return;
    if (!_formKey.currentState!.validate()) return;

    final success = await ref
        .read(serviceRequestControllerProvider.notifier)
        .submit(
          type: widget.type,
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
        );

    if (!mounted) return;
    if (success) {
      CommonSnackBar.show(context, 'リクエストを送信しました');
      context.pop();
    } else {
      CommonSnackBar.error(context, '送信に失敗しました');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controllerState = ref.watch(serviceRequestControllerProvider);
    final isLoading = controllerState is AsyncLoading;

    return CommonScaffold(
      appBar: AppBar(
        title: Text(widget.type.label, style: AppTextStyles.callout),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          children: [
            Text(
              widget.type == ServiceRequestType.bug
                  ? '不具合の内容を教えてください'
                  : 'ご要望の内容を教えてください',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),

            // タイトル
            Text('タイトル', style: AppTextStyles.footnote),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _titleController,
              style: AppTextStyles.body2,
              decoration: InputDecoration(
                hintText: widget.type == ServiceRequestType.bug
                    ? '例: ログインできない'
                    : '例: ダークモードに対応してほしい',
                hintStyle: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary,
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

            // 詳細
            Text('詳細', style: AppTextStyles.footnote),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _descriptionController,
              style: AppTextStyles.body2,
              maxLines: 8,
              minLines: 4,
              decoration: InputDecoration(
                hintText: widget.type == ServiceRequestType.bug
                    ? '発生した状況や手順を詳しく教えてください'
                    : '具体的にどのような機能があると嬉しいですか？',
                hintStyle: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary,
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
            onPressed: _submit,
            loading: isLoading,
            child: const Text('送信'),
          ),
        ),
      ),
    );
  }
}
