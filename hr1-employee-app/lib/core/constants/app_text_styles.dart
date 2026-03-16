import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// HR1 テキストスタイル定数
/// 命名規則: {fontWeight}{fontSize} (例: bold28 = w700/28pt)
/// 色はテーマから自動継承されるため、ここでは指定しない
class AppTextStyles {
  AppTextStyles._();

  /// 28pt Bold — 大見出し
  static TextStyle bold28 = GoogleFonts.notoSansJp(fontSize: 28, fontWeight: FontWeight.w700);

  /// 24pt Bold — 中見出し
  static TextStyle bold24 = GoogleFonts.notoSansJp(fontSize: 24, fontWeight: FontWeight.w700);

  /// 20pt SemiBold — 小見出し
  static TextStyle semiBold20 = GoogleFonts.notoSansJp(fontSize: 20, fontWeight: FontWeight.w600);

  /// 16pt SemiBold — サブタイトル
  static TextStyle semiBold16 = GoogleFonts.notoSansJp(fontSize: 16, fontWeight: FontWeight.w600);

  /// 14pt SemiBold — ボタン等
  static TextStyle semiBold14 = GoogleFonts.notoSansJp(fontSize: 14, fontWeight: FontWeight.w600);

  /// 14pt Regular — 本文
  static TextStyle regular14 = GoogleFonts.notoSansJp(fontSize: 14, fontWeight: FontWeight.w400);

  /// 12pt Medium — ラベル
  static TextStyle medium12 = GoogleFonts.notoSansJp(fontSize: 12, fontWeight: FontWeight.w500);

  /// 12pt Regular — 本文（小）
  static TextStyle regular12 = GoogleFonts.notoSansJp(fontSize: 12, fontWeight: FontWeight.w400);

  /// 11pt Regular — キャプション
  static TextStyle regular11 = GoogleFonts.notoSansJp(fontSize: 11, fontWeight: FontWeight.w400);

  /// 48pt ExtraLight — 時刻・カウンター等の数値表示
  static TextStyle extraLight48 = GoogleFonts.notoSansJp(fontSize: 48, fontWeight: FontWeight.w200);
}
