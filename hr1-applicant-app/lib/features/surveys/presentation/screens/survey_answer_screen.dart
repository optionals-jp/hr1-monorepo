import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/constants.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/pulse_survey.dart';
import '../controllers/survey_answer_controller.dart';
import '../providers/survey_providers.dart';

/// パルスサーベイ回答画面（応募者向け）
///
/// 未回答: 編集可能なフォーム + 送信ボタン
/// 回答済み: 読み取り専用で自分の回答を表示
class SurveyAnswerScreen extends HookConsumerWidget {
  const SurveyAnswerScreen({super.key, required this.survey});

  final PulseSurvey survey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final completedIds =
        ref.watch(completedSurveyIdsProvider).valueOrNull ?? {};
    final isCompleted = completedIds.contains(survey.id);

    if (isCompleted) {
      return _CompletedView(survey: survey);
    }
    return _EditView(survey: survey);
  }
}

/// 回答済み — 読み取り専用ビュー
class _CompletedView extends ConsumerWidget {
  const _CompletedView({required this.survey});
  final PulseSurvey survey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final answersAsync = ref.watch(myAnswersProvider(survey.id));

    return CommonScaffold(
      appBar: AppBar(
        title: Text(survey.title, style: AppTextStyles.callout),
        centerTitle: true,
      ),
      body: answersAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(myAnswersProvider(survey.id)),
        ),
        data: (answers) => ListView(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          children: [
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                borderRadius: AppRadius.radius80,
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, size: 18, color: AppColors.success),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    '回答済み',
                    style: AppTextStyles.caption1.copyWith(
                      color: AppColors.success,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            if (survey.description != null) ...[
              const SizedBox(height: AppSpacing.lg),
              Text(
                survey.description!,
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            ...survey.questions.map(
              (q) => _ReadOnlyQuestion(question: q, answer: answers[q.id]),
            ),
            const SizedBox(height: AppSpacing.xxxl),
          ],
        ),
      ),
    );
  }
}

/// 未回答 — 編集可能ビュー
class _EditView extends HookConsumerWidget {
  const _EditView({required this.survey});
  final PulseSurvey survey;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final answers = useRef(<String, String>{});
    final revision = useState(0);
    final controllerState = ref.watch(surveyAnswerControllerProvider);

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

    final _ = revision.value;

    return CommonScaffold(
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

/// 読み取り専用の質問表示
class _ReadOnlyQuestion extends StatelessWidget {
  const _ReadOnlyQuestion({required this.question, required this.answer});

  final PulseSurveyQuestion question;
  final String? answer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            question.label,
            style: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
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
          _buildAnswer(theme),
        ],
      ),
    );
  }

  Widget _buildAnswer(ThemeData theme) {
    if (answer == null || answer!.isEmpty) {
      return Text(
        '未回答',
        style: AppTextStyles.body2.copyWith(color: AppColors.textSecondary),
      );
    }

    switch (question.type) {
      case 'rating':
        final value = int.tryParse(answer!) ?? 0;
        return Row(
          children: List.generate(5, (i) {
            final v = i + 1;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: v <= value
                      ? AppColors.primaryLight.withValues(alpha: 0.15)
                      : theme.colorScheme.surface,
                  borderRadius: AppRadius.radius80,
                  border: Border.all(
                    color: v <= value
                        ? AppColors.primaryLight
                        : theme.colorScheme.outlineVariant,
                  ),
                ),
                child: Center(
                  child: Text(
                    '$v',
                    style: AppTextStyles.body2.copyWith(
                      fontWeight: FontWeight.w600,
                      color: v <= value
                          ? AppColors.primaryLight
                          : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            );
          }),
        );
      case 'single_choice':
        return Text(answer!, style: AppTextStyles.body2);
      case 'multiple_choice':
        try {
          final items = (jsonDecode(answer!) as List).cast<String>();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: items
                .map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Row(
                      children: [
                        Icon(Icons.check, size: 16, color: AppColors.success),
                        const SizedBox(width: 6),
                        Text(item, style: AppTextStyles.body2),
                      ],
                    ),
                  ),
                )
                .toList(),
          );
        } catch (_) {
          return Text(answer!, style: AppTextStyles.body2);
        }
      default:
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest.withValues(
              alpha: 0.3,
            ),
            borderRadius: AppRadius.radius80,
          ),
          child: Text(answer!, style: AppTextStyles.body2),
        );
    }
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
  });

  final PulseSurveyQuestion question;
  final String? currentAnswer;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
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
          _buildInput(theme),
        ],
      ),
    );
  }

  Widget _buildInput(ThemeData theme) {
    switch (question.type) {
      case 'rating':
        return _buildRating(theme);
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

  Widget _buildRating(ThemeData theme) {
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
