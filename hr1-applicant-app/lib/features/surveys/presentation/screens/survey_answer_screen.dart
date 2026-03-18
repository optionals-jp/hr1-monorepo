import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/common_button.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../../domain/entities/pulse_survey.dart';
import '../providers/survey_providers.dart';

/// パルスサーベイ回答画面（応募者向け）
class SurveyAnswerScreen extends ConsumerStatefulWidget {
  const SurveyAnswerScreen({super.key, required this.survey});

  final PulseSurvey survey;

  @override
  ConsumerState<SurveyAnswerScreen> createState() => _SurveyAnswerScreenState();
}

class _SurveyAnswerScreenState extends ConsumerState<SurveyAnswerScreen> {
  final Map<String, String> _answers = {};
  bool _submitting = false;

  PulseSurvey get survey => widget.survey;

  bool get _canSubmit {
    for (final q in survey.questions) {
      if (q.isRequired && (_answers[q.id]?.isEmpty ?? true)) {
        return false;
      }
    }
    return true;
  }

  Future<void> _submit() async {
    if (!_canSubmit || _submitting) return;

    // 送信確認ダイアログ
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('回答を送信'),
        content: const Text('回答を送信しますか？送信後は変更できません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('キャンセル'),
          ),
          CommonButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('送信'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _submitting = true);
    try {
      await ref
          .read(surveyRepositoryProvider)
          .submitResponse(surveyId: survey.id, answers: _answers);
      ref.invalidate(completedSurveyIdsProvider);
      if (mounted) {
        CommonSnackBar.show(context, '回答を送信しました');
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        CommonSnackBar.error(context, '送信に失敗しました。しばらくしてから再度お試しください。');
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (survey.questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text(survey.title, style: AppTextStyles.subtitle),
          centerTitle: true,
        ),
        body: Center(
          child: Text(
            '質問が設定されていません',
            style: AppTextStyles.body.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(survey.title, style: AppTextStyles.subtitle),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
        children: [
          if (survey.description != null) ...[
            Text(
              survey.description!,
              style: AppTextStyles.bodySmall.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
          ],
          ...survey.questions.map((q) => _buildQuestion(q, theme)),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            height: 48,
            child: CommonButton(
              onPressed: _canSubmit ? _submit : null,
              loading: _submitting,
              child: const Text('回答を送信'),
            ),
          ),
          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  Widget _buildQuestion(PulseSurveyQuestion q, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  q.label,
                  style: AppTextStyles.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (q.isRequired)
                Text(
                  '必須',
                  style: AppTextStyles.caption.copyWith(color: AppColors.error),
                ),
            ],
          ),
          if (q.description != null) ...[
            const SizedBox(height: 2),
            Text(
              q.description!,
              style: AppTextStyles.caption.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          _buildInput(q, theme),
        ],
      ),
    );
  }

  Widget _buildInput(PulseSurveyQuestion q, ThemeData theme) {
    switch (q.type) {
      case 'rating':
        return _buildRating(q, theme);
      case 'text':
        return _buildTextField(q);
      case 'single_choice':
        return _buildSingleChoice(q, theme);
      case 'multiple_choice':
        return _buildMultipleChoice(q, theme);
      default:
        return _buildTextField(q);
    }
  }

  Widget _buildRating(PulseSurveyQuestion q, ThemeData theme) {
    final currentValue = int.tryParse(_answers[q.id] ?? '') ?? 0;
    return Row(
      children: List.generate(5, (i) {
        final value = i + 1;
        final isSelected = value <= currentValue;
        return Padding(
          padding: const EdgeInsets.only(right: 8),
          child: GestureDetector(
            onTap: () => setState(() => _answers[q.id] = value.toString()),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppColors.primaryLight.withValues(alpha: 0.15)
                    : theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primaryLight
                      : theme.colorScheme.outlineVariant,
                ),
              ),
              child: Center(
                child: Text(
                  '$value',
                  style: AppTextStyles.body.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isSelected
                        ? AppColors.primaryLight
                        : theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildTextField(PulseSurveyQuestion q) {
    return TextField(
      maxLines: 3,
      decoration: const InputDecoration(
        hintText: '回答を入力',
        border: OutlineInputBorder(),
      ),
      onChanged: (v) => setState(() => _answers[q.id] = v),
    );
  }

  Widget _buildSingleChoice(PulseSurveyQuestion q, ThemeData theme) {
    final options = q.options ?? [];
    final selected = _answers[q.id];
    return Column(
      children: options.map((option) {
        return RadioListTile<String>(
          title: Text(option, style: AppTextStyles.body),
          value: option,
          groupValue: selected,
          contentPadding: EdgeInsets.zero,
          onChanged: (v) => setState(() => _answers[q.id] = v ?? ''),
        );
      }).toList(),
    );
  }

  Widget _buildMultipleChoice(PulseSurveyQuestion q, ThemeData theme) {
    final options = q.options ?? [];
    final raw = _answers[q.id];
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
          title: Text(option, style: AppTextStyles.body),
          value: isChecked,
          contentPadding: EdgeInsets.zero,
          onChanged: (v) {
            setState(() {
              if (v == true) {
                selected.add(option);
              } else {
                selected.remove(option);
              }
              _answers[q.id] = jsonEncode(selected.toList());
            });
          },
        );
      }).toList(),
    );
  }
}
