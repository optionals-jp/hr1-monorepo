import 'package:flutter/material.dart';

import '../utils/app_font.dart';

/// HR1 テキストスタイル定数 — Fluent 2 iOS Typography 準拠
///
/// https://fluent2.microsoft.design/typography
/// iOS は OS 標準（SF Pro / Hiragino Sans）、それ以外は Noto Sans JP を使用。
class AppTextStyles {
  AppTextStyles._();

  // ─── Display ───────────────────────────────────────────────────
  /// 48pt ExtraLight — 時刻・カウンター等の数値表示
  static TextStyle display = appFont(
    fontSize: 48,
    fontWeight: FontWeight.w200,
    height: 1.08,
    letterSpacing: 0,
  );

  // ─── Large Title ───────────────────────────────────────────────
  /// 34pt Regular — Large Title
  static TextStyle largeTitle = appFont(
    fontSize: 34,
    fontWeight: FontWeight.w700,
    height: 1.21,
    letterSpacing: 0.37,
  );

  // ─── Title ─────────────────────────────────────────────────────
  /// 28pt Regular — Title 1
  static TextStyle title1 = appFont(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    height: 1.21,
    letterSpacing: 0.36,
  );

  /// 22pt Regular — Title 2
  static TextStyle title2 = appFont(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    height: 1.27,
    letterSpacing: 0.35,
  );

  /// 20pt Regular — Title 3
  static TextStyle title3 = appFont(
    fontSize: 20,
    fontWeight: FontWeight.w700,
    height: 1.25,
    letterSpacing: 0.38,
  );

  // ─── Body ──────────────────────────────────────────────────────
  /// 17pt Semibold — Headline
  static TextStyle headline = appFont(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    height: 1.29,
  );

  /// 15pt Bold — Label 1
  static TextStyle label1 = appFont(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    height: 1.29,
  );

  /// 17pt Regular — Body 1
  static TextStyle body1 = appFont(
    fontSize: 17,
    fontWeight: FontWeight.w400,
    height: 1.29,
  );

  /// 16pt Regular — Callout
  static TextStyle callout = appFont(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.31,
    letterSpacing: -0.32,
  );

  /// 15pt Regular — Body 2 / Subheadline
  static TextStyle body2 = appFont(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.33,
  );

  // ─── Caption ───────────────────────────────────────────────────
  /// 13pt Regular — Footnote
  static TextStyle footnote = appFont(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.38,
    letterSpacing: -0.08,
  );

  /// 12pt Regular — Caption 1
  static TextStyle caption1 = appFont(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    height: 1.33,
    letterSpacing: 0,
  );

  /// 11pt Regular — Caption 2
  static TextStyle caption2 = appFont(
    fontSize: 11,
    fontWeight: FontWeight.w400,
    height: 1.18,
    letterSpacing: 0.07,
  );

  // ─── Stats / Numeric ───────────────────────────────────────────
  /// 30pt Bold — 統計カードの大きな数値（残業時間など）。
  /// `tabularFigures` で字幅を揃え、`letterSpacing` を負値で
  /// タイトに調整する。
  static TextStyle statValue = appFont(
    fontSize: 30,
    fontWeight: FontWeight.w700,
    height: 1.0,
    letterSpacing: -0.8,
  ).copyWith(fontFeatures: const [FontFeature.tabularFigures()]);

  /// 14pt SemiBold — `statValue` に付随する単位やプレフィクス（h, 残, など）。
  static TextStyle statUnit = appFont(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0,
  );
}
