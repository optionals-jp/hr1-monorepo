import 'package:flutter/material.dart';

/// Fluent 2 iOS Corner Radius トークン
///
/// https://fluent2.microsoft.design/corner-radius
class AppRadius {
  AppRadius._();

  // ── Corner Radius 値 ──────────────────────────────────────────
  static const double cornerRadiusNone = 0;
  static const double cornerRadius20 = 2.0;
  static const double cornerRadius40 = 4.0;
  static const double cornerRadius80 = 8.0;
  static const double cornerRadius120 = 12.0;
  static const double cornerRadius160 = 16.0;
  static const double cornerRadiusCircular = 9999.0;

  // ── BorderRadius (convenience) ───────────────────────────────
  static final BorderRadius radius20 = BorderRadius.circular(cornerRadius20);
  static final BorderRadius radius40 = BorderRadius.circular(cornerRadius40);
  static final BorderRadius radius80 = BorderRadius.circular(cornerRadius80);
  static final BorderRadius radius120 = BorderRadius.circular(cornerRadius120);
  static final BorderRadius radius160 = BorderRadius.circular(cornerRadius160);
  static final BorderRadius radiusCircular = BorderRadius.circular(
    cornerRadiusCircular,
  );
}
