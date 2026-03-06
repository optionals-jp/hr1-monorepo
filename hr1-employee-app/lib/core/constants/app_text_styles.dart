import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// HR1 テキストスタイル定数
class AppTextStyles {
  AppTextStyles._();

  /// 見出し1（大見出し）
  static TextStyle heading1 = GoogleFonts.notoSansJp(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  /// 見出し2（中見出し）
  static TextStyle heading2 = GoogleFonts.notoSansJp(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  /// 見出し3（小見出し）
  static TextStyle heading3 = GoogleFonts.notoSansJp(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  /// サブタイトル
  static TextStyle subtitle = GoogleFonts.notoSansJp(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  /// 本文（通常）
  static TextStyle body = GoogleFonts.notoSansJp(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
  );

  /// 本文（小）
  static TextStyle bodySmall = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );

  /// キャプション
  static TextStyle caption = GoogleFonts.notoSansJp(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );

  /// ボタンテキスト
  static TextStyle button = GoogleFonts.notoSansJp(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.surface,
  );

  /// ラベル
  static TextStyle label = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
  );
}
