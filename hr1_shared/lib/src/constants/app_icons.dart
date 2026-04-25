import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:hr1_shared/src/constants/app_colors.dart';

/// SVGアイコンウィジェットを関数スタイルで取得するユーティリティ
///
/// 使い方: `AppIcons.home(size: 20, color: Colors.red)`
class AppIcons {
  AppIcons._();

  static const _pkg = 'hr1_shared';

  // ── ナビゲーション ──
  static Widget home({double size = 24, Color? color}) =>
      _svg('ic-home', size: size, color: color);
  static Widget homeFill({double size = 24, Color? color}) =>
      _svg('ic-home-fill', size: size, color: color);
  static Widget note({double size = 24, Color? color}) =>
      _svg('ic-note', size: size, color: color);
  static Widget noteFill({double size = 24, Color? color}) =>
      _svg('ic-note-fill', size: size, color: color);
  static Widget notification({double size = 24, Color? color}) =>
      _svg('ic-notification', size: size, color: color);
  static Widget notificationFill({double size = 24, Color? color}) =>
      _svg('ic-notification-fill', size: size, color: color);
  static Widget setting({double size = 24, Color? color}) =>
      _svg('ic-setting', size: size, color: color);
  static Widget settingFill({double size = 24, Color? color}) =>
      _svg('ic-setting-fill', size: size, color: color);
  static Widget user({double size = 24, Color? color}) =>
      _svg('ic-user', size: size, color: color);
  static Widget userFill({double size = 24, Color? color}) =>
      _svg('ic-user-fill', size: size, color: color);

  // ── ビジネス・組織 ──
  static Widget personalcard({double size = 24, Color? color}) =>
      _svg('ic-personalcard', size: size, color: color);
  static Widget personalcardFill({double size = 24, Color? color}) =>
      _svg('ic-personalcard-fill', size: size, color: color);
  static Widget briefcase({double size = 24, Color? color}) =>
      _svg('ic-briefcase', size: size, color: color);
  static Widget briefcaseFill({double size = 24, Color? color}) =>
      _svg('ic-briefcase-fill', size: size, color: color);
  static Widget award({double size = 24, Color? color}) =>
      _svg('ic-award', size: size, color: color);
  static Widget awardFill({double size = 24, Color? color}) =>
      _svg('ic-award-fill', size: size, color: color);
  static Widget teacher({double size = 24, Color? color}) =>
      _svg('ic-teacher', size: size, color: color);
  static Widget teacherFill({double size = 24, Color? color}) =>
      _svg('ic-teacher-fill', size: size, color: color);
  static Widget hierarchy({double size = 24, Color? color}) =>
      _svg('ic-hierarchy', size: size, color: color);
  static Widget hierarchyFill({double size = 24, Color? color}) =>
      _svg('ic-hierarchy-fill', size: size, color: color);
  static Widget hierarchy2({double size = 24, Color? color}) =>
      _svg('ic-hierarchy2', size: size, color: color);
  static Widget hierarchy2Fill({double size = 24, Color? color}) =>
      _svg('ic-hierarchy2-fill', size: size, color: color);
  static Widget buliding({double size = 24, Color? color}) =>
      _svg('ic-buliding', size: size, color: color);
  static Widget bulidingFill({double size = 24, Color? color}) =>
      _svg('ic-buliding-fill', size: size, color: color);
  static Widget buildings({double size = 24, Color? color}) =>
      _svg('ic-buildings', size: size, color: color);
  static Widget buildingsFill({double size = 24, Color? color}) =>
      _svg('ic-buildings-fill', size: size, color: color);

  // ── カレンダー・時間 ──
  static Widget calendar({double size = 24, Color? color}) =>
      _svg('ic-calendar', size: size, color: color);
  static Widget calendarFill({double size = 24, Color? color}) =>
      _svg('ic-calendar-fill', size: size, color: color);
  static Widget calendarEdit({double size = 24, Color? color}) =>
      _svg('ic-calendar-edit', size: size, color: color);
  static Widget calendarEditFill({double size = 24, Color? color}) =>
      _svg('ic-calendar-edit-fill', size: size, color: color);
  static Widget calendarSearch({double size = 24, Color? color}) =>
      _svg('ic-calendar-search', size: size, color: color);
  static Widget calendarSearchFill({double size = 24, Color? color}) =>
      _svg('ic-calendar-search-fill', size: size, color: color);
  static Widget calendarTick({double size = 24, Color? color}) =>
      _svg('ic-calendar-tick', size: size, color: color);
  static Widget calendarTickFill({double size = 24, Color? color}) =>
      _svg('ic-calendar-tick-fill', size: size, color: color);
  static Widget clock({double size = 24, Color? color}) =>
      _svg('ic-clock', size: size, color: color);
  static Widget clockFill({double size = 24, Color? color}) =>
      _svg('ic-clock-fill', size: size, color: color);

  // ── 勤怠 ──
  static Widget login({double size = 24, Color? color}) =>
      _svg('ic-login', size: size, color: color);
  static Widget loginFill({double size = 24, Color? color}) =>
      _svg('ic-login-fill', size: size, color: color);
  static Widget logout({double size = 24, Color? color}) =>
      _svg('ic-logout', size: size, color: color);
  static Widget logoutFill({double size = 24, Color? color}) =>
      _svg('ic-logout-fill', size: size, color: color);
  static Widget pause({double size = 24, Color? color}) =>
      _svg('ic-pause', size: size, color: color);
  static Widget pauseFill({double size = 24, Color? color}) =>
      _svg('ic-pause-fill', size: size, color: color);
  static Widget coffee({double size = 24, Color? color}) =>
      _svg('ic-coffee', size: size, color: color);
  static Widget coffeeFill({double size = 24, Color? color}) =>
      _svg('ic-coffee-fill', size: size, color: color);

  // ── コミュニケーション ──
  static Widget sms({double size = 24, Color? color}) =>
      _svg('ic-sms', size: size, color: color);
  static Widget smsFill({double size = 24, Color? color}) =>
      _svg('ic-sms-fill', size: size, color: color);
  static Widget messageText({double size = 24, Color? color}) =>
      _svg('ic-message-text', size: size, color: color);
  static Widget messageTextFill({double size = 24, Color? color}) =>
      _svg('ic-message-text-fill', size: size, color: color);

  // ── アクション ──
  static Widget search({double size = 24, Color? color}) =>
      _svg('ic-search', size: size, color: color);
  static Widget searchFill({double size = 24, Color? color}) =>
      _svg('ic-search-fill', size: size, color: color);
  static Widget send({double size = 24, Color? color}) =>
      _svg('ic-send', size: size, color: color);
  static Widget sendFill({double size = 24, Color? color}) =>
      _svg('ic-send-fill', size: size, color: color);
  static Widget trash({double size = 24, Color? color}) =>
      _svg('ic-trash', size: size, color: color);
  static Widget trashFill({double size = 24, Color? color}) =>
      _svg('ic-trash-fill', size: size, color: color);
  static Widget tickCircle({double size = 24, Color? color}) =>
      _svg('ic-tick-circle', size: size, color: color);
  static Widget tickCircleFill({double size = 24, Color? color}) =>
      _svg('ic-tick-circle-fill', size: size, color: color);
  static Widget clipboardTick({double size = 24, Color? color}) =>
      _svg('ic-clipboard-tick', size: size, color: color);
  static Widget clipboardTickFill({double size = 24, Color? color}) =>
      _svg('ic-clipboard-tick-fill', size: size, color: color);
  static Widget arrow({double size = 24, Color? color}) =>
      _svg('ic-arrow', size: size, color: color);
  static Widget arrowFill({double size = 24, Color? color}) =>
      _svg('ic-arrow-fill', size: size, color: color);

  // ── コンテンツ ──
  static Widget doc({double size = 24, Color? color}) =>
      _svg('ic-doc', size: size, color: color);
  static Widget docFill({double size = 24, Color? color}) =>
      _svg('ic-doc-fill', size: size, color: color);
  static Widget folder({double size = 24, Color? color}) =>
      _svg('ic-folder', size: size, color: color);
  static Widget folderFill({double size = 24, Color? color}) =>
      _svg('ic-folder-fill', size: size, color: color);
  static Widget directbox({double size = 24, Color? color}) =>
      _svg('ic-directbox', size: size, color: color);
  static Widget directboxFill({double size = 24, Color? color}) =>
      _svg('ic-directbox-fill', size: size, color: color);

  // ── その他 ──
  static Widget call({double size = 24, Color? color}) =>
      _svg('ic-call', size: size, color: color);
  static Widget callFill({double size = 24, Color? color}) =>
      _svg('ic-call-fill', size: size, color: color);
  static Widget location({double size = 24, Color? color}) =>
      _svg('ic-location', size: size, color: color);
  static Widget locationFill({double size = 24, Color? color}) =>
      _svg('ic-location-fill', size: size, color: color);
  static Widget calculator({double size = 24, Color? color}) =>
      _svg('ic-calculator', size: size, color: color);
  static Widget calculatorFill({double size = 24, Color? color}) =>
      _svg('ic-calculator-fill', size: size, color: color);
  static Widget data({double size = 24, Color? color}) =>
      _svg('ic-data', size: size, color: color);
  static Widget dataFill({double size = 24, Color? color}) =>
      _svg('ic-data-fill', size: size, color: color);
  static Widget nemuBoard({double size = 24, Color? color}) =>
      _svg('ic-nemu-board', size: size, color: color);
  static Widget nemuBoardFill({double size = 24, Color? color}) =>
      _svg('ic-nemu-board-fill', size: size, color: color);
  static Widget brush({double size = 24, Color? color}) =>
      _svg('ic-brush', size: size, color: color);
  static Widget brushFill({double size = 24, Color? color}) =>
      _svg('ic-brush-fill', size: size, color: color);
  static Widget star({double size = 24, Color? color}) =>
      _svg('ic-star', size: size, color: color);
  static Widget starFill({double size = 24, Color? color}) =>
      _svg('ic-star-fill', size: size, color: color);

  // ── レイアウト ──
  static Widget rowHorizontal({double size = 24, Color? color}) =>
      _svg('ic-row-horizontal', size: size, color: color);
  static Widget rowHorizontalFill({double size = 24, Color? color}) =>
      _svg('ic-row-horizontal-fill', size: size, color: color);
  static Widget rowVertical({double size = 24, Color? color}) =>
      _svg('ic-row-vertical', size: size, color: color);
  static Widget rowVerticalFill({double size = 24, Color? color}) =>
      _svg('ic-row-vertical-fill', size: size, color: color);
  static Widget sliderHorizontal({double size = 24, Color? color}) =>
      _svg('ic-slider-horizontal', size: size, color: color);
  static Widget sliderHorizontalFill({double size = 24, Color? color}) =>
      _svg('ic-slider-horizontal-fill', size: size, color: color);
  static Widget sliderHorizontal2({double size = 24, Color? color}) =>
      _svg('ic-slider-horizontal2', size: size, color: color);
  static Widget sliderHorizontal2Fill({double size = 24, Color? color}) =>
      _svg('ic-slider-horizontal2-fill', size: size, color: color);
  static Widget sliderVertical({double size = 24, Color? color}) =>
      _svg('ic-slider-vertical', size: size, color: color);
  static Widget sliderVerticalFill({double size = 24, Color? color}) =>
      _svg('ic-slider-vertical-fill', size: size, color: color);
  static Widget sliderVertical2({double size = 24, Color? color}) =>
      _svg('ic-slider-vertical2', size: size, color: color);
  static Widget sliderVertical2Fill({double size = 24, Color? color}) =>
      _svg('ic-slider-vertical2-fill', size: size, color: color);

  /// アセット名からSVGウィジェットを生成（内部ヘルパー）
  ///
  /// [color] 未指定時はテーマの `onSurface` を使用
  static Widget _svg(String name, {double size = 24, Color? color}) {
    final path = 'packages/$_pkg/assets/$name.svg';
    if (color != null) {
      return SvgPicture.asset(
        path,
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      );
    }
    return Builder(
      builder: (context) {
        final themeColor = AppColors.textPrimary(context);
        return SvgPicture.asset(
          path,
          width: size,
          height: size,
          colorFilter: ColorFilter.mode(themeColor, BlendMode.srcIn),
        );
      },
    );
  }

  /// アセット名からSVGウィジェットを生成（動的パス用）
  static Widget svg(String name, {double size = 24, Color? color}) {
    return _svg(name, size: size, color: color);
  }
}
