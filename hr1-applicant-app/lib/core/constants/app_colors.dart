import 'package:flutter/material.dart';

/// HR1 ブランドカラーパレット
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // ブランドカラー（ライト/ダーク共通）
  // ---------------------------------------------------------------------------

  /// プライマリカラー（ネイビー）
  static const Color primary = Color(0xFF1B2F4E);

  /// プライマリライト（ブルー）
  static const Color primaryLight = Color(0xFF2563EB);

  /// アクセントカラー（スカイブルー）
  static const Color accent = Color(0xFF0EA5E9);

  /// 成功（グリーン）
  static const Color success = Color(0xFF059669);

  /// 警告（オレンジ）
  static const Color warning = Color(0xFFEA580C);

  /// エラー（レッド）
  static const Color error = Color(0xFFDC2626);

  /// サーベイ・研修用パープル
  static const Color purple = Color(0xFF8764B8);

  // ---------------------------------------------------------------------------
  // ライトモード
  // ---------------------------------------------------------------------------

  /// 背景色（白）
  static const Color background = Color(0xFFFFFFFF);

  /// サーフェス（ホワイト）
  static const Color surface = Color(0xFFFFFFFF);

  /// テキストプライマリ（ダークネイビー）
  static const Color textPrimary = Color(0xFF1E293B);

  /// テキストセカンダリ（グレー）
  static const Color textSecondary = Color(0xFF64748B);

  /// ボーダー（ライトグレー）
  static const Color border = Color(0xFFCBD5E1);

  /// ディバイダー（非常に薄い）
  static const Color divider = Color(0xFFE2E8F0);

  /// サーフェスセカンダリ
  static const Color surfaceSecondary = Color(0xFFF1F5F9);

  /// サーフェスターシャリ（入力欄背景・受信バブル等）
  static const Color surfaceTertiary = Color(0xFFEFEFEF);

  // ---------------------------------------------------------------------------
  // ダークモード
  // ---------------------------------------------------------------------------

  static const Color darkBackground = Color(0xFF292929);
  static const Color darkSurface = Color(0xFF292929);
  static const Color darkSurfaceSecondary = Color(0xFF1F1F1F);
  static const Color darkSurfaceTertiary = Color(0xFF3A3A3A);
  static const Color darkTextPrimary = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFFD6D6D6);
  static const Color darkBorder = Color(0xFF666666);
  static const Color darkDivider = Color(0xFF525252);

  // ---------------------------------------------------------------------------
  // MaterialColor
  // ---------------------------------------------------------------------------

  static const MaterialColor primarySwatch =
      MaterialColor(0xFF1B2F4E, <int, Color>{
        50: Color(0xFFE8EDF3),
        100: Color(0xFFC5D1E0),
        200: Color(0xFF9EB3CC),
        300: Color(0xFF7794B7),
        400: Color(0xFF597DA7),
        500: Color(0xFF3C6697),
        600: Color(0xFF345B8A),
        700: Color(0xFF2A4D78),
        800: Color(0xFF1B2F4E),
        900: Color(0xFF112240),
      });
}
