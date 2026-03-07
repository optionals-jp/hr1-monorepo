import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// SVGアイコンのアセットパス定数
class AppIcons {
  AppIcons._();

  static const String home = 'assets/ic-home.svg';
  static const String homeFill = 'assets/ic-home-fill.svg';
  static const String note = 'assets/ic-note.svg';
  static const String noteFill = 'assets/ic-note-fill.svg';
  static const String notification = 'assets/ic-notification.svg';
  static const String notificationFill = 'assets/ic-notification-fill.svg';
  static const String setting = 'assets/ic-setting.svg';
  static const String settingFill = 'assets/ic-setting-fill.svg';
  static const String user = 'assets/ic-user.svg';
  static const String userFill = 'assets/ic-user-fill.svg';

  /// SVGアイコンウィジェットを生成
  static Widget svg(
    String assetPath, {
    double size = 24,
    Color? color,
  }) {
    return SvgPicture.asset(
      assetPath,
      width: size,
      height: size,
      colorFilter:
          color != null ? ColorFilter.mode(color, BlendMode.srcIn) : null,
    );
  }
}
