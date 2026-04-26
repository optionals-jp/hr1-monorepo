import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/surveys/presentation/controllers/survey_answer_controller.dart';

class SurveyAnswerScreen extends HookConsumerWidget {
  const SurveyAnswerScreen({super.key, required this.survey});

  final PulseSurvey survey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final answers = useState<Map<String, String>>({});
    final submitting = useState(false);

    bool canSubmit() {
      for (final q in survey.questions) {
        if (q.isRequired && (answers.value[q.id]?.isEmpty ?? true)) {
          return false;
        }
      }
      return true;
    }

    Future<void> submit() async {
      if (!canSubmit() || submitting.value) return;

      final confirmed = await CommonDialog.confirm(
        context: context,
        title: '回答を送信',
        message: '回答を送信しますか？送信後は変更できません。',
        confirmLabel: '送信',
      );
      if (!confirmed) return;

      submitting.value = true;
      await ref
          .read(surveyAnswerControllerProvider.notifier)
          .submit(surveyId: survey.id, answers: Map.of(answers.value));

      final state = ref.read(surveyAnswerControllerProvider);
      if (!context.mounted) return;
      if (state.submitted) {
        CommonSnackBar.show(context, '回答を送信しました');
        context.pop();
      } else if (state.error != null) {
        CommonSnackBar.error(context, state.error!);
      }
      if (context.mounted) submitting.value = false;
    }

    if (survey.questions.isEmpty) {
      return CommonScaffold(
        appBar: AppBar(
          title: Text(survey.title, style: AppTextStyles.headline),
        ),
        body: Center(
          child: Text(
            '質問が設定されていません',
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
          ),
        ),
      );
    }

    Widget buildRating(PulseSurveyQuestion q) {
      final currentValue = int.tryParse(answers.value[q.id] ?? '') ?? 0;
      return Row(
        children: List.generate(5, (i) {
          final value = i + 1;
          final isSelected = value <= currentValue;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                answers.value = {...answers.value, q.id: value.toString()};
              },
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.brand.withValues(alpha: 0.15)
                      : AppColors.surface(context),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.brand
                        : AppColors.border(context),
                  ),
                ),
                child: Center(
                  child: Text(
                    '$value',
                    style: AppTextStyles.body2.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? AppColors.brand
                          : AppColors.textSecondary(context),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      );
    }

    Widget buildTextField(PulseSurveyQuestion q) {
      return TextField(
        maxLines: 3,
        decoration: const InputDecoration(
          hintText: '回答を入力',
          border: OutlineInputBorder(),
        ),
        onChanged: (v) {
          answers.value = {...answers.value, q.id: v};
        },
      );
    }

    Widget buildSingleChoice(PulseSurveyQuestion q) {
      final options = q.options ?? [];
      final selected = answers.value[q.id];
      return RadioGroup<String>(
        groupValue: selected,
        onChanged: (v) {
          answers.value = {...answers.value, q.id: v ?? ''};
        },
        child: Column(
          children: options.map((option) {
            return RadioListTile<String>(
              title: Text(option, style: AppTextStyles.body2),
              value: option,
              contentPadding: EdgeInsets.zero,
            );
          }).toList(),
        ),
      );
    }

    Widget buildMultipleChoice(PulseSurveyQuestion q) {
      final options = q.options ?? [];
      final raw = answers.value[q.id];
      Set<String> selected = {};
      if (raw != null && raw.isNotEmpty) {
        try {
          selected = (jsonDecode(raw) as List).cast<String>().toSet();
        } catch (_) {
          selected = {};
        }
      }
      return Column(
        children: options.map((option) {
          final isChecked = selected.contains(option);
          return CheckboxListTile(
            title: Text(option, style: AppTextStyles.body2),
            value: isChecked,
            contentPadding: EdgeInsets.zero,
            onChanged: (v) {
              final updated = Set<String>.of(selected);
              if (v == true) {
                updated.add(option);
              } else {
                updated.remove(option);
              }
              answers.value = {
                ...answers.value,
                q.id: jsonEncode(updated.toList()),
              };
            },
          );
        }).toList(),
      );
    }

    Widget buildInput(PulseSurveyQuestion q) {
      switch (q.type) {
        case 'rating':
          return buildRating(q);
        case 'text':
          return buildTextField(q);
        case 'single_choice':
          return buildSingleChoice(q);
        case 'multiple_choice':
          return buildMultipleChoice(q);
        default:
          return buildTextField(q);
      }
    }

    Widget buildQuestion(PulseSurveyQuestion q) {
      return Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.xl),
        child: Column(
          spacing: 6,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    q.label,
                    style: AppTextStyles.body1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (q.isRequired)
                  Text(
                    '必須',
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.error,
                    ),
                  ),
              ],
            ),
            if (q.description != null) ...[
              Text(
                q.description!,
                style: AppTextStyles.caption2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
              const SizedBox(height: 2),
            ],
            const SizedBox(height: AppSpacing.sm),
            buildInput(q),
          ],
        ),
      );
    }

    final isSubmitEnabled = canSubmit();

    return CommonScaffold(
      appBar: AppBar(title: Text(survey.title, style: AppTextStyles.headline)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          if (survey.description != null) ...[
            Text(
              survey.description!,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
          ...survey.questions.map((q) => buildQuestion(q)),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            height: 48,
            child: CommonButton(
              onPressed: isSubmitEnabled ? submit : null,
              loading: submitting.value,
              enabled: isSubmitEnabled,
              child: const Text('回答を送信'),
            ),
          ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }
}
