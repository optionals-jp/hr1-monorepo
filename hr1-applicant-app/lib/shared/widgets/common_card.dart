import 'package:flutter/material.dart';
import '../../core/constants/app_spacing.dart';

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
        borderRadius: BorderRadius.circular(16),
        border: highlighted && highlightColor != null
            ? Border.all(
                color: highlightColor!.withValues(alpha: 0.3),
                width: 0.5,
              )
            : Border.all(color: theme.dividerColor, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );

    if (margin != null || onTap == null) {
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

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenHorizontal,
        vertical: 4,
      ),
      child: GestureDetector(onTap: onTap, child: card),
    );
  }
}
