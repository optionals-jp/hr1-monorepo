import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// HR1 テキストスタイル定数 — Fluent 2 iOS Typography 準拠
///
/// https://fluent2.microsoft.design/typography
/// SF Pro の仕様を Noto Sans JP で再現。
class AppTextStyles {
  AppTextStyles._();

  // ─── Display ───────────────────────────────────────────────────
  /// 48pt ExtraLight — 時刻・カウンター等の数値表示
  static TextStyle display = GoogleFonts.notoSansJp(
    fontSize: 48,
    fontWeight: FontWeight.w200,
    height: 1.08,
    letterSpacing: 0,
  );

  // ─── Large Title ───────────────────────────────────────────────
  /// 34pt Regular — Large Title
  static TextStyle largeTitle = GoogleFonts.notoSansJp(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    height: 1.21,
    letterSpacing: 0.37,
  );

  // ─── Title ─────────────────────────────────────────────────────
  /// 28pt Regular — Title 1
  static TextStyle title1 = GoogleFonts.notoSansJp(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    height: 1.21,
    letterSpacing: 0.36,
  );

  /// 22pt Regular — Title 2
  static TextStyle title2 = GoogleFonts.notoSansJp(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    height: 1.27,
    letterSpacing: 0.35,
  );

  /// 20pt Regular — Title 3
  static TextStyle title3 = GoogleFonts.notoSansJp(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    height: 1.25,
    letterSpacing: 0.38,
  );

  // ─── Body ──────────────────────────────────────────────────────
  /// 17pt Semibold — Headline
  static TextStyle headline = GoogleFonts.notoSansJp(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    height: 1.29,
    letterSpacing: -0.41,
  );

  /// 17pt Regular — Body 1
  static TextStyle body1 = GoogleFonts.notoSansJp(
    fontSize: 17,
    fontWeight: FontWeight.w400,
    height: 1.29,
    letterSpacing: -0.41,
  );

  /// 16pt Regular — Callout
  static TextStyle callout = GoogleFonts.notoSansJp(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.31,
    letterSpacing: -0.32,
  );

  /// 15pt Regular — Body 2 / Subheadline
  static TextStyle body2 = GoogleFonts.notoSansJp(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.33,
    letterSpacing: -0.23,
  );

  // ─── Caption ───────────────────────────────────────────────────
  /// 13pt Regular — Footnote
  static TextStyle footnote = GoogleFonts.notoSansJp(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.38,
    letterSpacing: -0.08,
  );

  /// 12pt Regular — Caption 1
  static TextStyle caption1 = GoogleFonts.notoSansJp(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.33,
    letterSpacing: 0,
  );

  /// 11pt Regular — Caption 2
  static TextStyle caption2 = GoogleFonts.notoSansJp(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    height: 1.18,
    letterSpacing: 0.07,
  );
}
