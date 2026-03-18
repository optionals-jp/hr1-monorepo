import 'package:flutter/material.dart';
import '../../core/constants/app_text_styles.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final colors = _resolveColors(isDark);

    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colors.background,
        borderRadius: BorderRadius.circular(8),
        border: colors.border != null ? Border.all(color: colors.border!, width: 1) : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (avatar != null) ...[SizedBox(width: 16, height: 16, child: avatar), const SizedBox(width: 4)],
          if (icon != null) ...[Icon(icon, size: 16, color: colors.foreground), const SizedBox(width: 4)],
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

  _ChipColors _resolveColors(bool isDark) {
    if (!enabled) {
      return _ChipColors(
        background: isDark ? const Color(0xFF3D3D3D) : const Color(0xFFF0F0F0),
        foreground: const Color(0xFFBDBDBD),
      );
    }

    switch (style) {
      case FluentChipStyle.tint:
        return _tintColors(isDark);
      case FluentChipStyle.filled:
        return _filledColors(isDark);
    }
  }

  _ChipColors _tintColors(bool isDark) {
    switch (color) {
      case FluentChipColor.brand:
        return _ChipColors(
          background: isDark ? const Color(0xFF1B3A5C) : const Color(0xFFCFE4FA),
          foreground: isDark ? const Color(0xFF77B7F7) : const Color(0xFF0F548C),
        );
      case FluentChipColor.danger:
        return _ChipColors(
          background: isDark ? const Color(0xFF3B1519) : const Color(0xFFFDF3F4),
          foreground: isDark ? const Color(0xFFEE7981) : const Color(0xFF960B18),
        );
      case FluentChipColor.severe:
        return _ChipColors(
          background: isDark ? const Color(0xFF3C1A08) : const Color(0xFFFDF6F3),
          foreground: isDark ? const Color(0xFFF59D72) : const Color(0xFFC43501),
        );
      case FluentChipColor.warning:
        return _ChipColors(
          background: isDark ? const Color(0xFF3D2C08) : const Color(0xFFFFF9F5),
          foreground: isDark ? const Color(0xFFF7CE5C) : const Color(0xFFBC4B09),
          border: isDark ? null : const Color(0xFFDA3B01),
        );
      case FluentChipColor.success:
        return _ChipColors(
          background: isDark ? const Color(0xFF0D3B0D) : const Color(0xFFF1FAF1),
          foreground: isDark ? const Color(0xFF54B054) : const Color(0xFF0E700E),
        );
      case FluentChipColor.neutral:
        return _ChipColors(
          background: selected
              ? (isDark ? const Color(0xFF4D4D4D) : const Color(0xFFDBDBDB))
              : (isDark ? const Color(0xFF3D3D3D) : const Color(0xFFF0F0F0)),
          foreground: selected
              ? (isDark ? const Color(0xFFFFFFFF) : const Color(0xFF242424))
              : (isDark ? const Color(0xFFD6D6D6) : const Color(0xFF616161)),
        );
    }
  }

  _ChipColors _filledColors(bool isDark) {
    switch (color) {
      case FluentChipColor.brand:
        return const _ChipColors(background: Color(0xFF0F6CBD), foreground: Colors.white);
      case FluentChipColor.danger:
        return const _ChipColors(background: Color(0xFFC50F1F), foreground: Colors.white);
      case FluentChipColor.severe:
        return const _ChipColors(background: Color(0xFFDA3B01), foreground: Colors.white);
      case FluentChipColor.warning:
        return _ChipColors(background: const Color(0xFFF7630C), foreground: isDark ? Colors.white : Colors.black);
      case FluentChipColor.success:
        return const _ChipColors(background: Color(0xFF107C10), foreground: Colors.white);
      case FluentChipColor.neutral:
        return _ChipColors(
          background: isDark ? const Color(0xFF4D4D4D) : const Color(0xFFDBDBDB),
          foreground: isDark ? const Color(0xFFFFFFFF) : const Color(0xFF242424),
        );
    }
  }
}

class _ChipColors {
  const _ChipColors({required this.background, required this.foreground, this.border});

  final Color background;
  final Color foreground;
  final Color? border;
}
