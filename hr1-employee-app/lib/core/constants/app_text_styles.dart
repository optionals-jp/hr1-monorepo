import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// HR1 テキストスタイル定数
/// 色はテーマから自動継承されるため、ここでは指定しない
class AppTextStyles {
  AppTextStyles._();

  /// 見出し1（大見出し）
  static TextStyle heading1 = GoogleFonts.notoSansJp(
    fontSize: 28,
    fontWeight: FontWeight.w700,
  );

  /// 見出し2（中見出し）
  static TextStyle heading2 = GoogleFonts.notoSansJp(
    fontSize: 24,
    fontWeight: FontWeight.w700,
  );

  /// 見出し3（小見出し）
  static TextStyle heading3 = GoogleFonts.notoSansJp(
    fontSize: 20,
    fontWeight: FontWeight.w600,
  );

  /// サブタイトル
  static TextStyle subtitle = GoogleFonts.notoSansJp(
    fontSize: 16,
    fontWeight: FontWeight.w600,
  );

  /// 本文（通常）
  static TextStyle body = GoogleFonts.notoSansJp(
    fontSize: 14,
    fontWeight: FontWeight.w400,
  );

  /// 本文（小）
  static TextStyle bodySmall = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w400,
  );

  /// キャプション
  static TextStyle caption = GoogleFonts.notoSansJp(
    fontSize: 11,
    fontWeight: FontWeight.w400,
  );

  /// ボタンテキスト
  static TextStyle button = GoogleFonts.notoSansJp(
    fontSize: 14,
    fontWeight: FontWeight.w600,
  );

  /// ラベル
  static TextStyle label = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w500,
  );
}
