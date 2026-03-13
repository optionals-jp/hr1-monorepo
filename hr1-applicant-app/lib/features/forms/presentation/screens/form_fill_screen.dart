import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../applications/presentation/providers/applications_providers.dart';
import '../../domain/entities/form_field_item.dart';
import '../providers/forms_providers.dart';

/// フォーム回答画面（Google Forms風）
class FormFillScreen extends ConsumerStatefulWidget {
  const FormFillScreen({
    super.key,
    required this.formId,
    required this.applicationId,
    this.stepId,
  });

  final String formId;
  final String applicationId;
  final String? stepId;

  @override
  ConsumerState<FormFillScreen> createState() => _FormFillScreenState();
}

class _FormFillScreenState extends ConsumerState<FormFillScreen> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    final asyncForm = ref.watch(formDetailProvider(widget.formId));

    return Scaffold(
      appBar: AppBar(
        title: Text(asyncForm.valueOrNull?.title ?? 'フォーム'),
      ),
      body: asyncForm.when(
        data: (form) {
          if (form == null) {
            return const Center(child: Text('フォームが見つかりません'));
          }

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
              children: [
                // フォーム説明
                if (form.description != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.cardPadding),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight.withValues(alpha: 0.05),
                      borderRadius:
                          BorderRadius.circular(AppSpacing.cardRadius),
                      border: Border.all(
                        color: AppColors.primaryLight.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(form.description!,
                        style: AppTextStyles.body),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                ],

                // フィールド一覧
                ...form.fields.map((field) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                      child: _FormFieldWidget(
                        field: field,
                        formId: widget.formId,
                      ),
                    )),

                const SizedBox(height: AppSpacing.lg),

                // 送信ボタン
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryLight,
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      padding:
                          const EdgeInsets.symmetric(vertical: AppSpacing.md),
                      shape: RoundedRectangleBorder(
                        borderRadius:
                            BorderRadius.circular(AppSpacing.buttonRadius),
                      ),
                    ),
                    child: const Text('回答を送信'),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => const Center(child: Text('エラーが発生しました')),
      ),
    );
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      // 画面のcontextとrefを保持
      final screenContext = context;
      final screenRef = ref;

      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('送信確認'),
          content: const Text('回答を送信しますか？送信後の変更はできません。'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('キャンセル'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(dialogContext);

                // 回答をDBに保存
                final answers =
                    screenRef.read(formAnswersProvider(widget.formId));
                final userId =
                    Supabase.instance.client.auth.currentUser?.id;
                if (userId != null && answers.isNotEmpty) {
                  final now = DateTime.now().toIso8601String();
                  final rows = answers.entries
                      .where((e) => e.value != null)
                      .map((e) {
                        dynamic value = e.value;
                        if (value is DateTime) {
                          value = value.toIso8601String();
                        }
                        return {
                          'form_id': widget.formId,
                          'field_id': e.key,
                          'applicant_id': userId,
                          'value': value,
                          'submitted_at': now,
                        };
                      })
                      .toList();
                  await Supabase.instance.client
                      .from('form_responses')
                      .insert(rows);
                }

                // ステップを完了に更新し、次のステップを自動開始
                if (widget.stepId != null) {
                  final repo = screenRef.read(applicationsRepositoryProvider);
                  await repo.completeStepAsync(
                      widget.stepId!, widget.applicationId);
                }

                screenRef.invalidate(formAnswersProvider(widget.formId));
                screenRef.invalidate(applicationsProvider);
                screenRef.invalidate(
                    applicationDetailProvider(widget.applicationId));

                if (!screenContext.mounted) return;
                Navigator.pop(screenContext);
                ScaffoldMessenger.of(screenContext).showSnackBar(
                  const SnackBar(
                    content: Text('回答を送信しました'),
                    backgroundColor: AppColors.success,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryLight,
                foregroundColor: Theme.of(dialogContext).colorScheme.onPrimary,
              ),
              child: const Text('送信する'),
            ),
          ],
        ),
      );
    }
  }
}

class _FormFieldWidget extends ConsumerWidget {
  const _FormFieldWidget({
    required this.field,
    required this.formId,
  });

  final FormFieldItem field;
  final String formId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final answers = ref.watch(formAnswersProvider(formId));
    final notifier = ref.read(formAnswersProvider(formId).notifier);

    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: theme.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ラベル
          Row(
            children: [
              Expanded(
                child: Text(field.label, style: AppTextStyles.subtitle),
              ),
              if (field.isRequired)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '必須',
                    style: AppTextStyles.caption.copyWith(
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
            Text(field.description!, style: AppTextStyles.bodySmall.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            )),
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
        final selected = answers[field.id] is String ? answers[field.id] as String : null;
        return RadioGroup<String>(
          groupValue: selected ?? '',
          onChanged: (v) => notifier.setAnswer(field.id, v),
          child: Column(
            children: (field.options ?? []).map((option) {
              return RadioListTile<String>(
                title: Text(option, style: AppTextStyles.body),
                value: option,
                contentPadding: EdgeInsets.zero,
                activeColor: AppColors.primaryLight,
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
              title: Text(option, style: AppTextStyles.body),
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
              activeColor: AppColors.primaryLight,
              controlAffinity: ListTileControlAffinity.leading,
            );
          }).toList(),
        );

      case FormFieldType.dropdown:
        final selected = answers[field.id] is String ? answers[field.id] as String : null;
        return DropdownButtonFormField<String>(
          initialValue: selected,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
          ),
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
        return _DateField(
          field: field,
          answers: answers,
          notifier: notifier,
        );

      case FormFieldType.fileUpload:
        return OutlinedButton.icon(
          onPressed: () {
            // TODO: ファイル選択
          },
          icon: const Icon(Icons.upload_file),
          label: const Text('ファイルを選択'),
        );
    }
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
    final selected = answers[field.id] is DateTime ? answers[field.id] as DateTime : null;

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
