import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

import '../../domain/entities/ai_card.dart';

/// ワークフロー提案カード Widget。
///
/// レイアウト:
/// - 「申請の流れ」番号付きステップ
/// - 注意書き（オレンジ背景）— `notes` がある場合のみ表示
class WorkflowSuggestionCardView extends StatelessWidget {
  const WorkflowSuggestionCardView({super.key, required this.data});

  final WorkflowSuggestionCardData data;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Summary(
          balanceDays: data.balanceDays,
          approverName: data.approverName,
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          '申請の流れ',
          style: AppTextStyles.body1.copyWith(
            color: AppColors.textPrimary(context),
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        for (var i = 0; i < data.steps.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _NumberedStep(index: i + 1, text: data.steps[i]),
          ),
        if (data.notes != null) ...[
          const SizedBox(height: AppSpacing.sm),
          CommonInlineNotice(
            message: data.notes!,
            severity: CommonNoticeSeverity.warning,
          ),
        ],
      ],
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.balanceDays, required this.approverName});

  final double balanceDays;
  final String approverName;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(context), width: 0.5),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '残日数',
                  style: AppTextStyles.footnote.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${balanceDays.toStringAsFixed(balanceDays == balanceDays.roundToDouble() ? 0 : 1)}日',
                  style: AppTextStyles.title2.copyWith(
                    color: AppColors.textPrimary(context),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 1, height: 36, color: AppColors.border(context)),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '承認者',
                  style: AppTextStyles.footnote.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  approverName,
                  style: AppTextStyles.body1.copyWith(
                    color: AppColors.textPrimary(context),
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NumberedStep extends StatelessWidget {
  const _NumberedStep({required this.index, required this.text});

  final int index;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 22,
          child: Text(
            '$index.',
            style: AppTextStyles.body1.copyWith(
              color: AppColors.textPrimary(context),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Expanded(
          child: Text(
            text,
            style: AppTextStyles.body1.copyWith(
              color: AppColors.textPrimary(context),
            ),
          ),
        ),
      ],
    );
  }
}
