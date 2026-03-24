import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';

/// 横スクロール アクションチップ — Teams モバイルの提案アクション風
class PortalActionChip extends StatelessWidget {
  const PortalActionChip({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final Widget icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Color.alphaBlend(
            color.withValues(alpha: 0.1),
            AppColors.surface(context),
          ),
          borderRadius: AppRadius.radius160,
          border: Border.all(
            color: color.withValues(alpha: 0.15),
            width: AppStroke.strokeWidth05,
          ),
          boxShadow: AppShadows.of4(context),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            icon,
            const SizedBox(height: 6),
            Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary(context),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
