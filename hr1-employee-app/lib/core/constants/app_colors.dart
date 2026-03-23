import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart' as shared;

/// HR1 カラーパレット（後方互換ラッパー）
///
/// 実体は hr1_shared の AppColors。
/// 旧APIエイリアス（brandPrimary 等）を提供。
class AppColors {
  AppColors._();

  // ブランド
  static const Color brand = shared.AppColors.brand;
  static const Color brandLight = shared.AppColors.brandLight;
  static const Color brandSecondary = shared.AppColors.brandSecondary;

  // 旧エイリアス
  static const Color brandPrimary = shared.AppColors.brand;

  // セマンティック
  static const Color success = shared.AppColors.success;
  static const Color warning = shared.AppColors.warning;
  static const Color error = shared.AppColors.error;
  static const Color purple = shared.AppColors.purple;
  static const Color sunOrange = shared.AppColors.sunOrange;

  // ライトモード
  static const Color lightBackground = shared.AppColors.lightBackground;
  static const Color lightSurface = shared.AppColors.lightSurface;
  static const Color lightSurfaceSecondary =
      shared.AppColors.lightSurfaceSecondary;
  static const Color lightSurfaceTertiary =
      shared.AppColors.lightSurfaceTertiary;
  static const Color lightTextPrimary = shared.AppColors.lightTextPrimary;
  static const Color lightTextSecondary = shared.AppColors.lightTextSecondary;
  static const Color lightTextTertiary = shared.AppColors.lightTextTertiary;
  static const Color lightBorder = shared.AppColors.lightBorder;
  static const Color lightDivider = shared.AppColors.lightDivider;

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

  // テーマ対応ヘルパー
  static Color textSecondary(Brightness brightness) =>
      shared.AppColors.textSecondary(brightness);

  static Color textTertiary(Brightness brightness) =>
      shared.AppColors.textTertiary(brightness);

  static Color border(Brightness brightness) =>
      shared.AppColors.border(brightness);

  static Color divider(Brightness brightness) =>
      shared.AppColors.divider(brightness);

  static Color surfaceTertiary(Brightness brightness) =>
      shared.AppColors.surfaceTertiary(brightness);

  // MaterialColor
  static const MaterialColor primarySwatch = shared.AppColors.primarySwatch;
}
