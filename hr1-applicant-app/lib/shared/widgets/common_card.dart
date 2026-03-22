import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';

/// 共通カードコンポーネント
///
/// ```dart
/// CommonCard(
///   onTap: () => context.push('/detail'),
///   child: Text('内容'),
/// )
///
/// CommonCard(
///   highlighted: true,
///   highlightColor: AppColors.warning,
///   child: Text('強調カード'),
/// )
/// ```
class CommonCard extends StatelessWidget {
  const CommonCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.highlighted = false,
    this.highlightColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;

  /// true の場合、[highlightColor] でボーダーを強調
  final bool highlighted;
  final Color? highlightColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final card = Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: AppRadius.radius160,
        border: highlighted && highlightColor != null
            ? Border.all(
                color: highlightColor!.withValues(alpha: 0.3),
                width: AppStroke.strokeWidth05,
              )
            : Border.all(
                color: theme.dividerColor,
                width: AppStroke.strokeWidth05,
              ),
        boxShadow: AppShadows.shadow4,
      ),
      child: child,
    );

    final wrapped = Padding(
      padding:
          margin ??
          const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: 4,
          ),
      child: card,
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: wrapped);
    }
    return wrapped;
  }
}
