import 'package:flutter/material.dart';
import '../../../../../core/constants/constants.dart';

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
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 90,
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Color.alphaBlend(
            color.withValues(alpha: 0.1),
            theme.colorScheme.surface,
          ),
          borderRadius: AppRadius.radius160,
          border: Border.all(
            color: color.withValues(alpha: 0.15),
            width: AppStroke.strokeWidth05,
          ),
          boxShadow: AppShadows.shadow4,
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
                color: theme.colorScheme.onSurface,
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
