import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Fluent 2 iOS Shadow トークン
///
/// https://fluent2.microsoft.design/shadow
/// Each level has a key shadow + ambient shadow.
/// Dark mode: no elevation shadows (returns null).
class AppShadows {
  AppShadows._();

  static const List<BoxShadow> shadow2 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.05),
      offset: Offset(0, 1),
      blurRadius: 4,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.08),
      offset: Offset.zero,
      blurRadius: 4,
    ),
  ];

  static const List<BoxShadow> shadow4 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.14),
      offset: Offset(0, 2),
      blurRadius: 4,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.12),
      offset: Offset.zero,
      blurRadius: 2,
    ),
  ];

  static const List<BoxShadow> shadow8 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.14),
      offset: Offset(0, 4),
      blurRadius: 8,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.12),
      offset: Offset.zero,
      blurRadius: 2,
    ),
  ];

  static const List<BoxShadow> shadow16 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.14),
      offset: Offset(0, 8),
      blurRadius: 16,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.12),
      offset: Offset.zero,
      blurRadius: 2,
    ),
  ];

  static const List<BoxShadow> shadow28 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.24),
      offset: Offset(0, 14),
      blurRadius: 28,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.20),
      offset: Offset.zero,
      blurRadius: 8,
    ),
  ];

  static const List<BoxShadow> shadow64 = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.24),
      offset: Offset(0, 32),
      blurRadius: 64,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.20),
      offset: Offset.zero,
      blurRadius: 8,
    ),
  ];

  static List<BoxShadow>? of2(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow2;

  static List<BoxShadow>? of4(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow4;

  static List<BoxShadow>? of8(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow8;

  static List<BoxShadow>? of16(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow16;

  static List<BoxShadow>? of28(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow28;

  static List<BoxShadow>? of64(BuildContext context) =>
      AppColors.isDark(context) ? null : shadow64;
}
