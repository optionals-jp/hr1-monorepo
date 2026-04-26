import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// AI 応答待ちを示すバブル。「考え中…」のインラインスピナーを表示する。
class AiTypingIndicator extends StatelessWidget {
  const AiTypingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm + 2,
          ),
          decoration: BoxDecoration(
            color: AppColors.surface(context),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            border: Border.all(color: AppColors.border(context), width: 0.5),
            // CommonCard と同一のシャドウ。
            boxShadow: const [
              BoxShadow(
                color: Color(0x12000000),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const LoadingIndicator(size: 14),
              const SizedBox(width: AppSpacing.sm),
              Text(
                '考え中…',
                style: AppTextStyles.body2.copyWith(
                  color: AppColors.textSecondary(context),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
