import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// HR1 テキストスタイル — Fluent 2 iOS Typography Ramp 準拠
/// https://fluent2.microsoft.design/typography
/// 色はテーマから自動継承されるため、ここでは指定しない
class AppTextStyles {
  AppTextStyles._();

  /// Large Title — 34pt/41pt Bold
  static TextStyle largeTitle = GoogleFonts.notoSansJp(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    height: 41 / 34,
    letterSpacing: -0.4,
  );

  /// Title 1 — 28pt/34pt Bold（画面タイトル）
  static TextStyle heading1 = GoogleFonts.notoSansJp(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    height: 34 / 28,
    letterSpacing: -0.3,
  );

  /// Title 2 — 22pt/28pt Semibold（中見出し）
  static TextStyle heading2 = GoogleFonts.notoSansJp(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    height: 28 / 22,
    letterSpacing: -0.2,
  );

  /// Title 3 — 20pt/25pt Semibold（小見出し）
  static TextStyle heading3 = GoogleFonts.notoSansJp(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 25 / 20,
  );

  /// Subtitle — Body 1 Semibold — 17pt/22pt Semibold
  static TextStyle subtitle = GoogleFonts.notoSansJp(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    height: 22 / 17,
  );

  /// Body 1 — 17pt/22pt Regular（本文）
  static TextStyle body = GoogleFonts.notoSansJp(
    fontSize: 17,
    fontWeight: FontWeight.w400,
    height: 22 / 17,
  );

  /// Body 2 — 15pt/20pt Regular（本文小）
  static TextStyle bodySmall = GoogleFonts.notoSansJp(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 20 / 15,
  );

  /// Caption 1 — 13pt/18pt Regular
  static TextStyle caption = GoogleFonts.notoSansJp(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 18 / 13,
  );

  /// Caption 2 — 12pt/16pt Regular
  static TextStyle label = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    height: 16 / 12,
  );

  /// ボタンテキスト — Body 2 Semibold
  static TextStyle button = GoogleFonts.notoSansJp(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 20 / 15,
  );

  /// 数値表示（大）
  static TextStyle numericLarge = GoogleFonts.notoSansJp(
    fontSize: 36,
    fontWeight: FontWeight.w300,
    height: 1.2,
    letterSpacing: -0.5,
  );
}
