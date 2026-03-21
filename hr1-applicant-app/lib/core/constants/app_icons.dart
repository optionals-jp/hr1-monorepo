import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// SVGアイコンウィジェットを関数スタイルで取得するユーティリティ
///
/// 使い方: `AppIcons.home(size: 20, color: Colors.red)`
class AppIcons {
  AppIcons._();

  // ── アセットパス定数（内部用） ──
  static const String _home = 'assets/ic-home.svg';
  static const String _homeFill = 'assets/ic-home-fill.svg';
  static const String _note = 'assets/ic-note.svg';
  static const String _noteFill = 'assets/ic-note-fill.svg';
  static const String _notification = 'assets/ic-notification.svg';
  static const String _notificationFill = 'assets/ic-notification-fill.svg';
  static const String _setting = 'assets/ic-setting.svg';
  static const String _settingFill = 'assets/ic-setting-fill.svg';
  static const String _user = 'assets/ic-user.svg';
  static const String _userFill = 'assets/ic-user-fill.svg';
  static const String _send = 'assets/ic-send.svg';
  static const String _sendFill = 'assets/ic-send-fill.svg';
  static const String _tickCircle = 'assets/ic-tick-circle.svg';
  static const String _tickCircleFill = 'assets/ic-tick-circle-fill.svg';
  static const String _clipboardTick = 'assets/ic-clipboard-tick.svg';
  static const String _clipboardTickFill = 'assets/ic-clipboard-tick-fill.svg';
  static const String _directbox = 'assets/ic-directbox.svg';
  static const String _directboxFill = 'assets/ic-directbox-fill.svg';

  // ── ナビゲーション ──
  static Widget home({double size = 24, Color? color}) =>
      _svg(_home, size: size, color: color);
  static Widget homeFill({double size = 24, Color? color}) =>
      _svg(_homeFill, size: size, color: color);
  static Widget note({double size = 24, Color? color}) =>
      _svg(_note, size: size, color: color);
  static Widget noteFill({double size = 24, Color? color}) =>
      _svg(_noteFill, size: size, color: color);
  static Widget notification({double size = 24, Color? color}) =>
      _svg(_notification, size: size, color: color);
  static Widget notificationFill({double size = 24, Color? color}) =>
      _svg(_notificationFill, size: size, color: color);
  static Widget setting({double size = 24, Color? color}) =>
      _svg(_setting, size: size, color: color);
  static Widget settingFill({double size = 24, Color? color}) =>
      _svg(_settingFill, size: size, color: color);
  static Widget user({double size = 24, Color? color}) =>
      _svg(_user, size: size, color: color);
  static Widget userFill({double size = 24, Color? color}) =>
      _svg(_userFill, size: size, color: color);
  static Widget send({double size = 24, Color? color}) =>
      _svg(_send, size: size, color: color);
  static Widget sendFill({double size = 24, Color? color}) =>
      _svg(_sendFill, size: size, color: color);
  static Widget tickCircle({double size = 24, Color? color}) =>
      _svg(_tickCircle, size: size, color: color);
  static Widget tickCircleFill({double size = 24, Color? color}) =>
      _svg(_tickCircleFill, size: size, color: color);
  static Widget clipboardTick({double size = 24, Color? color}) =>
      _svg(_clipboardTick, size: size, color: color);
  static Widget clipboardTickFill({double size = 24, Color? color}) =>
      _svg(_clipboardTickFill, size: size, color: color);
  static Widget directbox({double size = 24, Color? color}) =>
      _svg(_directbox, size: size, color: color);
  static Widget directboxFill({double size = 24, Color? color}) =>
      _svg(_directboxFill, size: size, color: color);

  /// アセットパスからSVGウィジェットを生成（内部ヘルパー）
  ///
  /// [color] 未指定時はテーマの `onSurface` を使用
  /// （ライトモード → 黒系、ダークモード → 白系）
  static Widget _svg(String assetPath, {double size = 24, Color? color}) {
    if (color != null) {
      return SvgPicture.asset(
        assetPath,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
    }
    return Builder(
      builder: (context) {
        final themeColor = Theme.of(context).colorScheme.onSurface;
        return SvgPicture.asset(
          assetPath,
          width: size,
          height: size,
          colorFilter: ColorFilter.mode(themeColor, BlendMode.srcIn),
        );
      },
    );
  }

  /// アセットパスからSVGウィジェットを生成（動的パス用）
  static Widget svg(String assetPath, {double size = 24, Color? color}) {
    return _svg(assetPath, size: size, color: color);
  }
}
