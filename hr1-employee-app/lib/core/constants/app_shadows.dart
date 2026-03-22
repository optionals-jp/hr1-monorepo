import 'package:flutter/material.dart';

/// Fluent 2 iOS Shadow トークン
///
/// https://fluent2.microsoft.design/shadow
class AppShadows {
  AppShadows._();

  /// shadow2 — カード、ポップオーバー
  static const List<BoxShadow> shadow2 = [
    BoxShadow(color: Color(0x0A000000), blurRadius: 2, offset: Offset(0, 1)),
  ];

  /// shadow4 — フローティング要素
  static const List<BoxShadow> shadow4 = [
    BoxShadow(color: Color(0x12000000), blurRadius: 4, offset: Offset(0, 2)),
  ];

  /// shadow8 — ドロップダウン、ツールチップ
  static const List<BoxShadow> shadow8 = [
    BoxShadow(color: Color(0x14000000), blurRadius: 8, offset: Offset(0, 4)),
  ];

  /// shadow16 — ダイアログ、モーダル
  static const List<BoxShadow> shadow16 = [
    BoxShadow(color: Color(0x1C000000), blurRadius: 16, offset: Offset(0, 8)),
  ];

  /// shadow28 — フルスクリーンオーバーレイ
  static const List<BoxShadow> shadow28 = [
    BoxShadow(color: Color(0x24000000), blurRadius: 28, offset: Offset(0, 14)),
  ];
}
