import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_action.dart';

/// AI 応答に付随するクイックアクションボタンの行。
///
/// - 各ボタンの幅は **ラベル文言に応じた可変幅**（`CommonButton` のデフォルトは
///   `minimumSize: Size(double.infinity, 44)` で全幅化されるため、style を上書き）
/// - [Wrap] により横一列に並べられない場合は次行へ折り返す
class AiActionButtonRow extends StatelessWidget {
  const AiActionButtonRow({
    super.key,
    required this.actions,
    required this.onPressed,
  });

  final List<AiAction> actions;
  final void Function(AiAction action) onPressed;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final action in actions)
          _ActionButton(action: action, onPressed: () => onPressed(action)),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.action, required this.onPressed});

  final AiAction action;
  final VoidCallback onPressed;

  // インライン用の共通寸法。`Size(0, 40)` で intrinsic width（文言依存）に。
  static const _shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(10)),
  );
  static const _padding = EdgeInsets.symmetric(horizontal: 14, vertical: 6);
  static const _minimumSize = Size(0, 36);

  @override
  Widget build(BuildContext context) {
    if (action.style == AiActionStyle.primary) {
      return CommonButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.brand.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white.withValues(alpha: 0.6),
          minimumSize: _minimumSize,
          padding: _padding,
          shape: _shape,
          elevation: 0,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          textStyle: AppTextStyles.label1,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [const Text('→ '), Text(action.label)],
        ),
      );
    }
    return CommonButton.outline(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.brand,
        disabledForegroundColor: AppColors.lightTextTertiary,
        minimumSize: _minimumSize,
        padding: _padding,
        shape: _shape,
        side: const BorderSide(color: AppColors.brand, width: 1),
        elevation: 0,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: AppTextStyles.label1,
      ),
      child: Text(action.label),
    );
  }
}
