import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

import '../../domain/entities/ai_reference.dart';

/// 「参照した情報」セクション全体。
///
/// 番号付き行を縦並びで表示。各行は番号バッジ + タイトル + 外部リンクアイコン。
class AiReferenceList extends StatelessWidget {
  const AiReferenceList({super.key, required this.references});

  final List<AiReference> references;

  @override
  Widget build(BuildContext context) {
    if (references.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '参照した情報',
          style: AppTextStyles.label1.copyWith(
            color: AppColors.textSecondary(context),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        for (final ref in references)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: _AiReferenceChip(reference: ref),
          ),
      ],
    );
  }
}

class _AiReferenceChip extends StatelessWidget {
  const _AiReferenceChip({required this.reference});

  final AiReference reference;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 8,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border(context)),
      ),
      child: Row(
        children: [
          _IndexBadge(index: reference.index),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              reference.title,
              style: AppTextStyles.label1.copyWith(
                color: AppColors.textPrimary(context),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          AppIcons.export(size: 14, color: AppColors.textSecondary(context)),
        ],
      ),
    );
  }
}

class _IndexBadge extends StatelessWidget {
  const _IndexBadge({required this.index});

  final int index;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 20,
      height: 20,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.brand,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        '$index',
        style: AppTextStyles.caption2.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
