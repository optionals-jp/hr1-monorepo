import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/forms/domain/entities/form_field_item.dart';
import 'package:hr1_applicant_app/features/forms/presentation/controllers/form_fill_controller.dart';
import 'package:hr1_applicant_app/features/forms/presentation/providers/forms_providers.dart';

/// フォーム回答画面（Google Forms風）
class FormFillScreen extends HookConsumerWidget {
  const FormFillScreen({
    super.key,
    required this.formId,
    required this.applicationId,
    this.stepId,
  });

  final String formId;
  final String applicationId;
  final String? stepId;

  ({String formId, String applicationId, String? stepId}) get _controllerArg =>
      (formId: formId, applicationId: applicationId, stepId: stepId);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final asyncForm = ref.watch(formDetailProvider(formId));
    final controllerState = ref.watch(
      formFillControllerProvider(_controllerArg),
    );

    // 送信成功時の処理
    ref.listen(formFillControllerProvider(_controllerArg), (prev, next) {
      if (next.submitted && !(prev?.submitted ?? false)) {
        Navigator.pop(context);
        CommonSnackBar.show(context, '回答を送信しました');
      }
      if (next.error != null && prev?.error == null) {
        CommonSnackBar.show(context, next.error!);
      }
    });

    Future<void> submit() async {
      if (!(formKey.currentState?.validate() ?? false)) return;

      final confirmed = await CommonDialog.confirm(
        context: context,
        title: '送信確認',
        message: '回答を送信しますか？送信後の変更はできません。',
        confirmLabel: '送信する',
      );
      if (!confirmed) return;

      ref.read(formFillControllerProvider(_controllerArg).notifier).submit();
    }

    return CommonScaffold(
      appBar: AppBar(title: Text(asyncForm.valueOrNull?.title ?? 'フォーム')),
      bottomAction: asyncForm.valueOrNull != null
          ? CommonButton(
              onPressed: submit,
              loading: controllerState.isSubmitting,
              child: const Text('回答を送信'),
            )
          : null,
      body: asyncForm.when(
        data: (form) {
          if (form == null) {
            return const ErrorState(message: 'フォームが見つかりません');
          }

          return Form(
            key: formKey,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
              children: [
                // フォーム説明
                if (form.description != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.cardPadding),
                    decoration: BoxDecoration(
                      color: AppColors.brand.withValues(alpha: 0.05),
                      borderRadius: AppRadius.radius120,
                      border: Border.all(
                        color: AppColors.brand.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(form.description!, style: AppTextStyles.body2),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],

                // フィールド一覧
                ...form.fields.map(
                  (field) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                    child: _FormFieldWidget(field: field, formId: formId),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(formDetailProvider(formId)),
        ),
      ),
    );
  }
}

class _FormFieldWidget extends ConsumerWidget {
  const _FormFieldWidget({required this.field, required this.formId});

  final FormFieldItem field;
  final String formId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final answers = ref.watch(formAnswersProvider(formId));
    final notifier = ref.read(formAnswersProvider(formId).notifier);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: AppRadius.radius120,
        border: Border.all(color: AppColors.divider(context)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ラベル
          Row(
            children: [
              Expanded(child: Text(field.label, style: AppTextStyles.callout)),
              if (field.isRequired)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: AppRadius.radius40,
                  ),
                  child: Text(
                    '必須',
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),

          // 説明
          if (field.description != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              field.description!,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
          ],

          const SizedBox(height: AppSpacing.md),

          // 入力フィールド
          _buildInput(context, answers, notifier),
        ],
      ),
    );
  }

  Widget _buildInput(
    BuildContext context,
    Map<String, dynamic> answers,
    FormAnswersNotifier notifier,
  ) {
    switch (field.type) {
      case FormFieldType.shortText:
        return TextFormField(
          decoration: InputDecoration(
            hintText: field.placeholder ?? '回答を入力',
            border: const OutlineInputBorder(),
          ),
          onChanged: (v) => notifier.setAnswer(field.id, v),
          validator: field.isRequired
              ? (v) => (v == null || v.isEmpty) ? '入力してください' : null
              : null,
        );

      case FormFieldType.longText:
        return TextFormField(
          decoration: InputDecoration(
            hintText: field.placeholder ?? '回答を入力',
            border: const OutlineInputBorder(),
          ),
          maxLines: 5,
          onChanged: (v) => notifier.setAnswer(field.id, v),
          validator: field.isRequired
              ? (v) => (v == null || v.isEmpty) ? '入力してください' : null
              : null,
        );

      case FormFieldType.radio:
        final selected = answers[field.id] is String
            ? answers[field.id] as String
            : null;
        return RadioGroup<String>(
          groupValue: selected ?? '',
          onChanged: (v) => notifier.setAnswer(field.id, v),
          child: Column(
            children: (field.options ?? []).map((option) {
              return RadioListTile<String>(
                title: Text(option, style: AppTextStyles.body2),
                value: option,
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.brand,
              );
            }).toList(),
          ),
        );

      case FormFieldType.checkbox:
        final rawList = answers[field.id];
        final selected = rawList is List ? rawList.cast<String>() : <String>[];
        return Column(
          children: (field.options ?? []).map((option) {
            return CheckboxListTile(
              title: Text(option, style: AppTextStyles.body2),
              value: selected.contains(option),
              onChanged: (checked) {
                final updated = List<String>.from(selected);
                if (checked == true) {
                  updated.add(option);
                } else {
                  updated.remove(option);
                }
                notifier.setAnswer(field.id, updated);
              },
              contentPadding: EdgeInsets.zero,
              activeColor: AppColors.brand,
              controlAffinity: ListTileControlAffinity.leading,
            );
          }).toList(),
        );

      case FormFieldType.dropdown:
        final selected = answers[field.id] is String
            ? answers[field.id] as String
            : null;
        return DropdownButtonFormField<String>(
          initialValue: selected,
          decoration: const InputDecoration(border: OutlineInputBorder()),
          hint: const Text('選択してください'),
          items: (field.options ?? []).map((option) {
            return DropdownMenuItem(value: option, child: Text(option));
          }).toList(),
          onChanged: (v) => notifier.setAnswer(field.id, v),
          validator: field.isRequired
              ? (v) => v == null ? '選択してください' : null
              : null,
        );

      case FormFieldType.date:
        return _DateField(field: field, answers: answers, notifier: notifier);

      case FormFieldType.fileUpload:
        return _FileUploadField(
          field: field,
          formId: formId,
          answers: answers,
          notifier: notifier,
        );
    }
  }
}

class _FileUploadField extends HookConsumerWidget {
  const _FileUploadField({
    required this.field,
    required this.formId,
    required this.answers,
    required this.notifier,
  });

  final FormFieldItem field;
  final String formId;
  final Map<String, dynamic> answers;
  final FormAnswersNotifier notifier;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isUploading = useState(false);
    final fileName = useState<String?>(null);

    useEffect(() {
      final existing = answers[field.id];
      if (existing is String && existing.isNotEmpty) {
        fileName.value = Uri.parse(existing).pathSegments.lastOrNull;
      }
      return null;
    }, []);

    Future<void> pickAndUpload() async {
      final result = await FilePicker.pickFiles();
      if (result == null || result.files.isEmpty) return;

      final platformFile = result.files.first;
      if (platformFile.path == null) return;

      isUploading.value = true;

      try {
        final file = File(platformFile.path!);
        final ext = platformFile.extension ?? '';
        final repo = ref.read(formsRepositoryProvider);
        final url = await repo.uploadFormFile(
          formId: formId,
          fieldId: field.id,
          file: file,
          extension: ext,
        );
        notifier.setAnswer(field.id, url);
        fileName.value = platformFile.name;
      } catch (e) {
        debugPrint('Upload failed: $e');
        if (context.mounted) {
          CommonSnackBar.error(context, 'ファイルのアップロードに失敗しました');
        }
      } finally {
        isUploading.value = false;
      }
    }

    if (isUploading.value) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpacing.md),
        child: LoadingIndicator(size: 20),
      );
    }

    if (fileName.value != null) {
      return Row(
        children: [
          Icon(Icons.check_circle, color: AppColors.success, size: 20),
          const SizedBox(width: AppSpacing.xs),
          Expanded(
            child: Text(
              fileName.value!,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          CommonButton.outline(
            onPressed: pickAndUpload,
            child: const Text('変更'),
          ),
        ],
      );
    }

    return CommonButton.outline(
      onPressed: pickAndUpload,
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.upload_file, size: 18),
          SizedBox(width: AppSpacing.xs),
          Text('ファイルを選択'),
        ],
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.field,
    required this.answers,
    required this.notifier,
  });

  final FormFieldItem field;
  final Map<String, dynamic> answers;
  final FormAnswersNotifier notifier;

  @override
  Widget build(BuildContext context) {
    final selected = answers[field.id] is DateTime
        ? answers[field.id] as DateTime
        : null;

    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: selected ?? DateTime.now(),
          firstDate: DateTime.now(),
          lastDate: DateTime.now().add(const Duration(days: 365)),
        );
        if (date != null) {
          notifier.setAnswer(field.id, date);
        }
      },
      child: InputDecorator(
        decoration: InputDecoration(
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.calendar_today),
          hintText: '日付を選択',
          errorText: field.isRequired && selected == null ? null : null,
        ),
        child: selected != null
            ? Text(
                '${selected.year}/${selected.month.toString().padLeft(2, '0')}/${selected.day.toString().padLeft(2, '0')}',
              )
            : null,
      ),
    );
  }
}
