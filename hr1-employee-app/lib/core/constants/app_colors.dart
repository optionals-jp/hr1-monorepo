import 'package:flutter/material.dart';

/// HR1 カラーパレット — Fluent 2 Design System 準拠
/// https://fluent2.microsoft.design/color
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------------------
  // ブランドカラー（ライト/ダーク共通）
  // ---------------------------------------------------------------------------

  /// ブランドプライマリ（Fluent 2 Brand）
  static const Color brandPrimary = Color(0xFF0F6CBD);

  /// ブランドセカンダリ
  static const Color brandSecondary = Color(0xFF115EA3);

  /// ブランドライト（hover / tint）
  static const Color brandLight = Color(0xFF2886DE);

  /// 成功（Fluent 2 Success）
  static const Color success = Color(0xFF0E7A0B);

  /// 警告（Fluent 2 Warning）
  static const Color warning = Color(0xFFBC4B09);

  /// エラー（Fluent 2 Danger）
  static const Color error = Color(0xFFB10E1C);

  // ---------------------------------------------------------------------------
  // ライトモード — Fluent 2 webLightTheme 準拠
  // ---------------------------------------------------------------------------

  /// ページ背景 — サーフェスと統一（白基調）
  static const Color lightBackground = Color(0xFFFFFFFF);

  /// colorNeutralBackground1 — サーフェス/カード
  static const Color lightSurface = Color(0xFFFFFFFF);

  /// colorNeutralBackground2 — セカンダリサーフェス
  static const Color lightSurfaceSecondary = Color(0xFFFAFAFA);

  /// colorNeutralBackground3 — ターシャリサーフェス（入力欄背景・受信バブル等）
  static const Color lightSurfaceTertiary = Color(0xFFEFEFEF);

  /// colorNeutralForeground1 — プライマリテキスト
  static const Color lightTextPrimary = Color(0xFF242424);

  /// colorNeutralForeground2 — セカンダリテキスト
  static const Color lightTextSecondary = Color(0xFF616161);

  /// colorNeutralForeground3 — ターシャリテキスト
  static const Color lightTextTertiary = Color(0xFF707070);

  /// colorNeutralStroke2 — ボーダー
  static const Color lightBorder = Color(0xFFE0E0E0);

  /// colorNeutralStroke3 — ディバイダー（非常に薄い）
  static const Color lightDivider = Color(0xFFF0F0F0);

  // ---------------------------------------------------------------------------
  // ダークモード — Fluent 2 webDarkTheme 準拠
  // ---------------------------------------------------------------------------

  /// ページ背景 — サーフェスと統一（濃いグレー基調）
  static const Color darkBackground = Color(0xFF292929);

  /// colorNeutralBackground1 — サーフェス/カード
  static const Color darkSurface = Color(0xFF292929);

  /// colorNeutralBackground2 — セカンダリサーフェス
  static const Color darkSurfaceSecondary = Color(0xFF1F1F1F);

  /// colorNeutralBackground3 — ターシャリサーフェス
  static const Color darkSurfaceTertiary = Color(0xFF3A3A3A);

  /// colorNeutralForeground1 — プライマリテキスト
  static const Color darkTextPrimary = Color(0xFFFFFFFF);

  /// colorNeutralForeground2 — セカンダリテキスト
  static const Color darkTextSecondary = Color(0xFFD6D6D6);

  /// colorNeutralForeground3 — ターシャリテキスト
  static const Color darkTextTertiary = Color(0xFFADADAD);

  /// colorNeutralStroke1 — ボーダー
  static const Color darkBorder = Color(0xFF666666);

  /// colorNeutralStroke2 — ディバイダー
  static const Color darkDivider = Color(0xFF525252);

  // ---------------------------------------------------------------------------
  // MaterialColor（互換用）
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // テーマ対応ヘルパー（BuildContext 拡張で使用）
  // ---------------------------------------------------------------------------

  /// セカンダリテキスト（ライト: #616161 / ダーク: #D6D6D6）
  static Color textSecondary(Brightness brightness) =>
      brightness == Brightness.dark ? darkTextSecondary : lightTextSecondary;

  /// ターシャリテキスト（ライト: #707070 / ダーク: #ADADAD）
  static Color textTertiary(Brightness brightness) =>
      brightness == Brightness.dark ? darkTextTertiary : lightTextTertiary;

  /// ボーダー
  static Color border(Brightness brightness) =>
      brightness == Brightness.dark ? darkBorder : lightBorder;

  /// ディバイダー
  static Color divider(Brightness brightness) =>
      brightness == Brightness.dark ? darkDivider : lightDivider;

  /// ターシャリサーフェス（入力欄背景・受信バブル等）
  static Color surfaceTertiary(Brightness brightness) =>
      brightness == Brightness.dark
          ? darkSurfaceTertiary
          : lightSurfaceTertiary;

  // ---------------------------------------------------------------------------
  // MaterialColor（互換用）
  // ---------------------------------------------------------------------------

  static const MaterialColor primarySwatch =
      MaterialColor(0xFF0F6CBD, <int, Color>{
        50: Color(0xFFE8F4FD),
        100: Color(0xFFC5E3FA),
        200: Color(0xFF9FD1F6),
        300: Color(0xFF78BFF2),
        400: Color(0xFF5BB1EF),
        500: Color(0xFF0F6CBD),
        600: Color(0xFF115EA3),
        700: Color(0xFF0E4F88),
        800: Color(0xFF0B406E),
        900: Color(0xFF083254),
      });
}
