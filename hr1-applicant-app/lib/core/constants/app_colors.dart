import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart' as shared;

/// HR1 カラーパレット（後方互換ラッパー）
///
/// 実体は hr1_shared の AppColors。
/// 旧APIエイリアス（primaryLight, accent, *Of() 等）を提供。
class AppColors {
  AppColors._();

  // ブランド
  static const Color brand = shared.AppColors.brand;
  static const Color brandLight = shared.AppColors.brandLight;
  static const Color brandSecondary = shared.AppColors.brandSecondary;

  // 旧エイリアス
  static const Color primary = shared.AppColors.brandSecondary;
  static const Color primaryLight = shared.AppColors.brand;
  static const Color accent = shared.AppColors.brandLight;

  // セマンティック
  static const Color success = shared.AppColors.success;
  static const Color warning = shared.AppColors.warning;
  static const Color error = shared.AppColors.error;
  static const Color purple = shared.AppColors.purple;

  // ライトモード
  static const Color background = shared.AppColors.lightBackground;
  static const Color surface = shared.AppColors.lightSurface;
  static const Color textPrimary = shared.AppColors.lightTextPrimary;
  static const Color textSecondary = shared.AppColors.lightTextSecondary;
  static const Color textTertiary = shared.AppColors.lightTextTertiary;
  static const Color border = shared.AppColors.lightBorder;
  static const Color divider = shared.AppColors.lightDivider;
  static const Color surfaceSecondary = shared.AppColors.lightSurfaceSecondary;
  static const Color surfaceTertiary = shared.AppColors.lightSurfaceTertiary;

  // ダークモード
  static const Color darkBackground = shared.AppColors.darkBackground;
  static const Color darkSurface = shared.AppColors.darkSurface;
  static const Color darkSurfaceSecondary =
      shared.AppColors.darkSurfaceSecondary;
  static const Color darkSurfaceTertiary = shared.AppColors.darkSurfaceTertiary;
  static const Color darkTextPrimary = shared.AppColors.darkTextPrimary;
  static const Color darkTextSecondary = shared.AppColors.darkTextSecondary;
  static const Color darkTextTertiary = shared.AppColors.darkTextTertiary;
  static const Color darkBorder = shared.AppColors.darkBorder;
  static const Color darkDivider = shared.AppColors.darkDivider;

  // テーマ対応ヘルパー（旧 "Of" サフィックス API）
  static Color textPrimaryOf(Brightness brightness) =>
      shared.AppColors.textPrimary(brightness);

  static Color textSecondaryOf(Brightness brightness) =>
      shared.AppColors.textSecondary(brightness);

  static Color textTertiaryOf(Brightness brightness) =>
      shared.AppColors.textTertiary(brightness);

  static Color borderOf(Brightness brightness) =>
      shared.AppColors.border(brightness);

  static Color dividerOf(Brightness brightness) =>
      shared.AppColors.divider(brightness);

  static Color surfaceTertiaryOf(Brightness brightness) =>
      shared.AppColors.surfaceTertiary(brightness);

  // MaterialColor
  static const MaterialColor primarySwatch = shared.AppColors.primarySwatch;
}
