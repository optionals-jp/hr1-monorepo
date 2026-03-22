import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/constants.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/pulse_survey.dart';
import '../controllers/survey_answer_controller.dart';

/// パルスサーベイ回答画面（応募者向け）
class SurveyAnswerScreen extends HookConsumerWidget {
  const SurveyAnswerScreen({super.key, required this.survey});

  final PulseSurvey survey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final answers = useRef(<String, String>{});
    final revision = useState(0);
    final controllerState = ref.watch(surveyAnswerControllerProvider);
    final theme = Theme.of(context);

    void updateAnswer(String questionId, String value) {
      answers.value[questionId] = value;
      revision.value++;
    }

    bool canSubmit() {
      for (final q in survey.questions) {
        if (q.isRequired && (answers.value[q.id]?.isEmpty ?? true)) {
          return false;
        }
      }
      return true;
    }

    Future<void> submit() async {
      if (!canSubmit() || controllerState.isSubmitting) return;

      final confirmed = await CommonDialog.confirm(
        context: context,
        title: '回答を送信',
        message: '回答を送信しますか？送信後は変更できません。',
        confirmLabel: '送信',
      );
      if (!confirmed) return;

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
    }

    if (survey.questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(survey.title, style: AppTextStyles.callout),
          centerTitle: true,
        ),
        body: Center(
          child: Text(
            '質問が設定されていません',
            style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary),
          ),
        ),
      );
    }

    // revision.value を参照してリビルドを確実にする
    final _ = revision.value;

    return Scaffold(
      appBar: AppBar(
        title: Text(survey.title, style: AppTextStyles.callout),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          if (survey.description != null) ...[
            Text(
              survey.description!,
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
          ...survey.questions.map(
            (q) => _QuestionWidget(
              question: q,
              currentAnswer: answers.value[q.id],
              onChanged: (value) => updateAnswer(q.id, value),
              theme: theme,
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            height: 48,
            child: CommonButton(
              onPressed: canSubmit() ? submit : null,
              loading: controllerState.isSubmitting,
              child: const Text('回答を送信'),
            ),
          ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// 質問ウィジェット
// ---------------------------------------------------------------------------

class _QuestionWidget extends StatelessWidget {
  const _QuestionWidget({
    required this.question,
    required this.currentAnswer,
    required this.onChanged,
    required this.theme,
  });

  final PulseSurveyQuestion question;
  final String? currentAnswer;
  final ValueChanged<String> onChanged;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  question.label,
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (question.isRequired)
                Text(
                  '必須',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.error,
                  ),
                ),
            ],
          ),
          if (question.description != null) ...[
            const SizedBox(height: 2),
            Text(
              question.description!,
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          _buildInput(),
        ],
      ),
    );
  }

  Widget _buildInput() {
    switch (question.type) {
      case 'rating':
        return _buildRating();
      case 'text':
        return _buildTextField();
      case 'single_choice':
        return _buildSingleChoice();
      case 'multiple_choice':
        return _buildMultipleChoice();
      default:
        return _buildTextField();
    }
  }

  Widget _buildRating() {
    final currentValue = int.tryParse(currentAnswer ?? '') ?? 0;
    return Row(
      children: List.generate(5, (i) {
        final value = i + 1;
        final isSelected = value <= currentValue;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => onChanged(value.toString()),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primaryLight.withValues(alpha: 0.15)
                    : theme.colorScheme.surface,
                borderRadius: AppRadius.radius80,
                border: Border.all(
                  color: isSelected
                      ? AppColors.primaryLight
                      : theme.colorScheme.outlineVariant,
                ),
              ),
              child: Center(
                child: Text(
                  '$value',
                  style: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? AppColors.primaryLight
                        : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildTextField() {
    return TextField(
      maxLines: 3,
      decoration: const InputDecoration(
        hintText: '回答を入力',
        border: OutlineInputBorder(),
      ),
      onChanged: onChanged,
    );
  }

  Widget _buildSingleChoice() {
    final options = question.options ?? [];
    return Column(
      children: options.map((option) {
        return RadioListTile<String>(
          title: Text(option, style: AppTextStyles.body2),
          value: option,
          groupValue: currentAnswer,
          contentPadding: EdgeInsets.zero,
          onChanged: (v) => onChanged(v ?? ''),
        );
      }).toList(),
    );
  }

  Widget _buildMultipleChoice() {
    final options = question.options ?? [];
    Set<String> selected = {};
    if (currentAnswer != null && currentAnswer!.isNotEmpty) {
      try {
        selected = (jsonDecode(currentAnswer!) as List).cast<String>().toSet();
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
            if (v == true) {
              selected.add(option);
            } else {
              selected.remove(option);
            }
            onChanged(jsonEncode(selected.toList()));
          },
        );
      }).toList(),
    );
  }
}
