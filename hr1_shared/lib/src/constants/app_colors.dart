import 'package:flutter/material.dart';

/// HR1 共通カラーパレット
class AppColors {
  AppColors._();

  // =========================================================================
  // ブランドカラー
  // =========================================================================

  /// プライマリブランド色
  static const Color brand = Color(0xFF0F6CBD);

  /// ブランドライト（hover / tint）
  static const Color brandLight = Color(0xFF2886DE);

  /// ブランドセカンダリ
  static const Color brandSecondary = Color(0xFF115EA3);

  // =========================================================================
  // セマンティックカラー
  // =========================================================================

  static const Color success = Color(0xFF0E7A0B);
  static const Color warning = Color(0xFFBC4B09);
  static const Color error = Color(0xFFB10E1C);

  /// サーベイ・研修用パープル
  static const Color purple = Color(0xFF8764B8);

  /// My Day / サンアイコン用オレンジ
  static const Color sunOrange = Color(0xFFE8912D);

  // =========================================================================
  // ライトモード
  // =========================================================================

  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceSecondary = Color(0xFFFAFAFA);
  static const Color lightSurfaceTertiary = Color(0xFFEFEFEF);
  static const Color lightTextPrimary = Color(0xFF242424);
  static const Color lightTextSecondary = Color(0xFF616161);
  static const Color lightTextTertiary = Color(0xFF707070);
  static const Color lightBorder = Color(0xFFE0E0E0);
  static const Color lightDivider = Color(0xFFF0F0F0);

  // =========================================================================
  // ダークモード
  // =========================================================================

  static const Color darkBackground = Color(0xFF292929);
  static const Color darkSurface = Color(0xFF292929);
  static const Color darkSurfaceSecondary = Color(0xFF1F1F1F);
  static const Color darkSurfaceTertiary = Color(0xFF3A3A3A);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFFD6D6D6);
  static const Color darkTextTertiary = Color(0xFFADADAD);
  static const Color darkBorder = Color(0xFF666666);
  static const Color darkDivider = Color(0xFF525252);

  // =========================================================================
  // テーマ対応ヘルパー
  // =========================================================================

  static Color textPrimary(Brightness brightness) =>
      brightness == Brightness.dark ? darkTextPrimary : lightTextPrimary;

  static Color textSecondary(Brightness brightness) =>
      brightness == Brightness.dark ? darkTextSecondary : lightTextSecondary;

  static Color textTertiary(Brightness brightness) =>
      brightness == Brightness.dark ? darkTextTertiary : lightTextTertiary;

  static Color border(Brightness brightness) =>
      brightness == Brightness.dark ? darkBorder : lightBorder;

  static Color divider(Brightness brightness) =>
      brightness == Brightness.dark ? darkDivider : lightDivider;

  static Color surfaceTertiary(Brightness brightness) =>
      brightness == Brightness.dark ? darkSurfaceTertiary : lightSurfaceTertiary;

  // =========================================================================
  // MaterialColor
  // =========================================================================

  static const MaterialColor primarySwatch =
      MaterialColor(0xFF0F6CBD, <int, Color>{
    50: Color(0xFFE8F4FD),
    100: Color(0xFFC5E3FA),
    200: Color(0xFF9FD1F6),
    300: Color(0xFF78BFF2),
    400: Color(0xFF5BB1EF),
    500: Color(0xFF0F6CBD),
    600: Color(0xFF115EA3),
    700: Color(0xFF0E4F88),
    800: Color(0xFF0B406E),
    900: Color(0xFF083254),
  });
}
