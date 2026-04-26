import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// ラベル / チップの塗りつぶし・枠線バリアント。
enum CommonLabelVariant { filled, outlined }

/// 共通ラベル — ステータス・優先度・分類など、色付きの短いテキストラベル。
///
/// - [CommonLabelVariant.filled] は [color] の薄いチント背景、[outlined] は
///   [color] の枠線のみ。文字色は常に [color]。
/// - [dense] = true で `Wrap` 内に並べたとき行高が増えないようコンパクト化。
class CommonLabel extends StatelessWidget {
  const CommonLabel({
    super.key,
    required this.text,
    required this.color,
    this.variant = CommonLabelVariant.filled,
    this.dense = false,
  });

  final String text;
  final Color color;
  final CommonLabelVariant variant;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final filled = variant == CommonLabelVariant.filled;
    final padding = dense
        ? const EdgeInsets.symmetric(horizontal: 7, vertical: 1)
        : EdgeInsets.symmetric(
            horizontal: AppSpacing.sm,
            vertical: AppSpacing.xs,
          );
    final fillAlpha = dense ? 0.08 : 0.12;
    final letterSpacing = dense ? 0.1 : 0.3;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: filled ? color.withValues(alpha: fillAlpha) : null,
        border: filled ? null : Border.all(color: color.withValues(alpha: 0.4)),
        borderRadius: BorderRadius.circular(AppRadius.cornerRadiusCircular),
      ),
      child: Text(
        text,
        style: AppTextStyles.caption2.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: letterSpacing,
          color: color,
        ),
      ),
    );
  }
}
