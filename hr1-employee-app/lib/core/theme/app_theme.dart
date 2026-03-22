import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';

/// HR1 アプリテーマ定義 — Fluent 2 Design System 準拠
class AppTheme {
  AppTheme._();

  /// ライトモードテーマ
  static ThemeData get light => _build(
    brightness: Brightness.light,
    background: AppColors.lightBackground,
    surface: AppColors.lightSurface,
    surfaceSecondary: AppColors.lightSurfaceSecondary,
    textPrimary: AppColors.lightTextPrimary,
    textSecondary: AppColors.lightTextSecondary,
    border: AppColors.lightBorder,
    divider: AppColors.lightDivider,
  );

  /// ダークモードテーマ
  static ThemeData get dark => _build(
    brightness: Brightness.dark,
    background: AppColors.darkBackground,
    surface: AppColors.darkSurface,
    surfaceSecondary: AppColors.darkSurfaceSecondary,
    textPrimary: AppColors.darkTextPrimary,
    textSecondary: AppColors.darkTextSecondary,
    border: AppColors.darkBorder,
    divider: AppColors.darkDivider,
  );

  static ThemeData _build({
    required Brightness brightness,
    required Color background,
    required Color surface,
    required Color surfaceSecondary,
    required Color textPrimary,
    required Color textSecondary,
    required Color border,
    required Color divider,
  }) {
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,

      // カラースキーム
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.brandPrimary,
        brightness: brightness,
        primary: AppColors.brandPrimary,
        secondary: AppColors.brandLight,
        error: AppColors.error,
        surface: surface,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: textPrimary,
        onError: Colors.white,
        outline: border,
        outlineVariant: divider,
        surfaceContainerHighest: surfaceSecondary,
      ),

      // 背景色
      scaffoldBackgroundColor: background,

      // テキストテーマ
      textTheme: GoogleFonts.notoSansJpTextTheme(
        isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
      ),

      // AppBar テーマ — クリーンでフラット
      appBarTheme: AppBarTheme(
        backgroundColor: surface,
        foregroundColor: textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: true,
        systemOverlayStyle: isDark
            ? SystemUiOverlayStyle.light
            : SystemUiOverlayStyle.dark,
        titleTextStyle: GoogleFonts.notoSansJp(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: textPrimary,
          letterSpacing: -0.1,
        ),
        iconTheme: IconThemeData(color: textPrimary, size: 22),
      ),

      // ElevatedButton テーマ — ピル型
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.brandPrimary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 50),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.radius80),
          elevation: 0,
          textStyle: GoogleFonts.notoSansJp(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // OutlinedButton テーマ
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.brandPrimary,
          minimumSize: const Size(double.infinity, 50),
          side: BorderSide(
            color: AppColors.brandPrimary.withValues(alpha: 0.3),
          ),
          shape: RoundedRectangleBorder(borderRadius: AppRadius.radius80),
          textStyle: GoogleFonts.notoSansJp(
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // TextButton テーマ
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.brandPrimary,
          textStyle: GoogleFonts.notoSansJp(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // InputDecoration テーマ
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceSecondary,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.radius80,
          borderSide: BorderSide(color: border, width: 0.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.radius80,
          borderSide: BorderSide(color: border, width: 0.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.radius80,
          borderSide: const BorderSide(
            color: AppColors.brandPrimary,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.radius80,
          borderSide: const BorderSide(color: AppColors.error, width: 0.5),
        ),
        labelStyle: GoogleFonts.notoSansJp(fontSize: 14, color: textSecondary),
        hintStyle: GoogleFonts.notoSansJp(
          fontSize: 14,
          color: textSecondary.withValues(alpha: 0.7),
        ),
      ),

      // Card テーマ — Fluent 2: ボーダーなし、微細なシャドウ
      cardTheme: CardThemeData(
        color: surface,
        elevation: isDark ? 0 : 1,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.radius120,
          side: isDark
              ? BorderSide(color: border.withValues(alpha: 0.3), width: 0.5)
              : BorderSide.none,
        ),
        margin: EdgeInsets.zero,
      ),

      // BottomNavigationBar テーマ
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: AppColors.brandPrimary,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: GoogleFonts.notoSansJp(
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
        unselectedLabelStyle: GoogleFonts.notoSansJp(
          fontSize: 10,
          fontWeight: FontWeight.w400,
        ),
      ),

      // Divider テーマ
      dividerTheme: DividerThemeData(
        color: divider,
        thickness: 0.5,
        space: 0.5,
      ),

      // SnackBar テーマ
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.radius80),
      ),

      // Dialog テーマ
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.cornerRadius160),
        ),
        titleTextStyle: GoogleFonts.notoSansJp(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: textPrimary,
        ),
      ),

      // BottomSheet テーマ
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
      ),

      // ListTile テーマ
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 2,
        ),
        visualDensity: const VisualDensity(horizontal: 0, vertical: -1),
      ),
    );
  }
}
