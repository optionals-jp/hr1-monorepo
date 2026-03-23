import 'package:flutter/material.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';

/// Fluent 2 iOS Chip のカラーバリアント
enum FluentChipColor { brand, danger, severe, warning, success, neutral }

/// Fluent 2 iOS Chip のスタイルバリアント
enum FluentChipStyle { tint, filled }

/// Fluent 2 iOS Chip コンポーネント
///
/// Figma: padding h:8 v:2, corner-radius:4, gap:8, text:body2(15pt)
///
/// ```dart
/// // Tint + Success + アイコン付き
/// FluentChip(
///   label: '出勤',
///   color: FluentChipColor.success,
///   icon: Icons.check_circle_outline,
///   onTap: () {},
/// )
///
/// // Filled + Brand + テキストのみ
/// FluentChip(
///   label: 'New',
///   color: FluentChipColor.brand,
///   style: FluentChipStyle.filled,
/// )
///
/// // Disabled
/// FluentChip(
///   label: 'Text',
///   enabled: false,
/// )
/// ```
class FluentChip extends StatelessWidget {
  const FluentChip({
    super.key,
    required this.label,
    this.color = FluentChipColor.neutral,
    this.style = FluentChipStyle.tint,
    this.icon,
    this.avatar,
    this.onTap,
    this.enabled = true,
    this.selected = false,
  });

  /// ラベル（Text やアイコン付き Row など任意の Widget）
  final Widget label;

  /// カラーバリアント
  final FluentChipColor color;

  /// スタイルバリアント（Tint / Filled）
  final FluentChipStyle style;

  /// 左側アイコン（Icon タイプ）
  final IconData? icon;

  /// 左側アバター（Person タイプ — Widget を直接渡す）
  final Widget? avatar;

  /// タップコールバック
  final VoidCallback? onTap;

  /// 有効/無効
  final bool enabled;

  /// 選択状態（Tint の場合 selected 背景を使用）
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final colors = _resolveColors(brightness);

    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: AppRadius.radius80,
        border: colors.border != null
            ? Border.all(color: colors.border!, width: 1)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (avatar != null) ...[
            SizedBox(width: 16, height: 16, child: avatar),
            const SizedBox(width: 4),
          ],
          if (icon != null) ...[
            Icon(icon, size: 16, color: colors.foreground),
            const SizedBox(width: 4),
          ],
          DefaultTextStyle(
            style: AppTextStyles.body2.copyWith(color: colors.foreground),
            child: label,
          ),
        ],
      ),
    );

    if (onTap != null && enabled) {
      return GestureDetector(onTap: onTap, child: child);
    }
    return child;
  }

  _ChipColors _resolveColors(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    if (!enabled) {
      return _ChipColors(
        background: isDark
            ? AppColors.disabledChipBgDark
            : AppColors.lightDivider,
        foreground: AppColors.disabledChipFg,
      );
    }

    switch (style) {
      case FluentChipStyle.tint:
        return _tintColors(brightness);
      case FluentChipStyle.filled:
        return _filledColors(brightness);
    }
  }

  _ChipColors _tintColors(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    switch (color) {
      case FluentChipColor.brand:
        return _ChipColors(
          background: isDark
              ? AppColors.brandTintBgDark
              : AppColors.brandTintBgLight,
          foreground: isDark
              ? AppColors.brandTintFgDark
              : AppColors.brandTintFgLight,
        );
      case FluentChipColor.danger:
        return _ChipColors(
          background: isDark
              ? AppColors.dangerTintBgDark
              : AppColors.dangerTintBgLight,
          foreground: isDark
              ? AppColors.dangerTintFgDark
              : AppColors.dangerTintFgLight,
        );
      case FluentChipColor.severe:
        return _ChipColors(
          background: isDark
              ? AppColors.severeTintBgDark
              : AppColors.severeTintBgLight,
          foreground: isDark
              ? AppColors.severeTintFgDark
              : AppColors.severeTintFgLight,
        );
      case FluentChipColor.warning:
        return _ChipColors(
          background: isDark
              ? AppColors.warningTintBgDark
              : AppColors.warningTintBgLight,
          foreground: isDark ? AppColors.warningTintFgDark : AppColors.warning,
          border: isDark ? null : AppColors.warningTintBorder,
        );
      case FluentChipColor.success:
        return _ChipColors(
          background: isDark
              ? AppColors.successTintBgDark
              : AppColors.successTintBgLight,
          foreground: isDark
              ? AppColors.successTintFgDark
              : AppColors.successTintFgLight,
        );
      case FluentChipColor.neutral:
        return _ChipColors(
          background: selected
              ? (isDark
                    ? AppColors.neutralChipBgDark
                    : AppColors.neutralChipBgLight)
              : (isDark
                    ? AppColors.disabledChipBgDark
                    : AppColors.lightDivider),
          foreground: selected
              ? AppColors.textPrimary(brightness)
              : AppColors.textSecondary(brightness),
        );
    }
  }

  _ChipColors _filledColors(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    switch (color) {
      case FluentChipColor.brand:
        return const _ChipColors(
          background: AppColors.brand,
          foreground: Colors.white,
        );
      case FluentChipColor.danger:
        return const _ChipColors(
          background: AppColors.danger,
          foreground: Colors.white,
        );
      case FluentChipColor.severe:
        return const _ChipColors(
          background: AppColors.severe,
          foreground: Colors.white,
        );
      case FluentChipColor.warning:
        return _ChipColors(
          background: AppColors.warningFilled,
          foreground: isDark ? Colors.white : Colors.black,
        );
      case FluentChipColor.success:
        return const _ChipColors(
          background: AppColors.successFilled,
          foreground: Colors.white,
        );
      case FluentChipColor.neutral:
        return _ChipColors(
          background: isDark
              ? AppColors.neutralChipBgDark
              : AppColors.neutralChipBgLight,
          foreground: AppColors.textPrimary(brightness),
        );
    }
  }
}

class _ChipColors {
  const _ChipColors({
    required this.background,
    required this.foreground,
    this.border,
  });

  final Color background;
  final Color foreground;
  final Color? border;
}
