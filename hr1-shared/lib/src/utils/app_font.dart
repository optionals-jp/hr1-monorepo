import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// プラットフォーム標準フォントを優先する [TextStyle] ファクトリ。
///
/// - iOS: `fontFamily` を未指定にして OS 標準（欧文 SF Pro / 日本語 Hiragino Sans）
///   を使用する。
/// - その他 (Android 等): `google_fonts` 経由で Noto Sans JP を使用する。
TextStyle appFont({
  double? fontSize,
  FontWeight? fontWeight,
  Color? color,
  double? height,
  double? letterSpacing,
}) {
  if (Platform.isIOS) {
    return TextStyle(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
      letterSpacing: letterSpacing,
    );
  }
  return GoogleFonts.notoSansJp(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
    height: height,
    letterSpacing: letterSpacing,
  );
}

/// プラットフォーム標準フォントを優先する [TextTheme] ファクトリ。
///
/// - iOS: 引数の base をそのまま返し、`ThemeData` 既定の system フォントを使う。
/// - その他: Noto Sans JP の text theme を返す。
TextTheme appFontTextTheme(TextTheme base) {
  if (Platform.isIOS) {
    return base;
  }
  return GoogleFonts.notoSansJpTextTheme(base);
}
