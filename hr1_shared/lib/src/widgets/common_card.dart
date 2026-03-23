import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

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
      padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: highlighted && highlightColor != null
            ? Border.all(
                color: highlightColor!.withValues(alpha: 0.3),
                width: 0.5,
              )
            : Border.all(
                color: theme.dividerColor,
                width: 0.5,
              ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 4,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );

    final wrapped = Padding(
      padding:
          margin ??
          const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
            vertical: AppSpacing.xs,
          ),
      child: card,
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: wrapped);
    }
    return wrapped;
  }
}
