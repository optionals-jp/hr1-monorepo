import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// SVGアイコンのアセットパス定数
class AppIcons {
  AppIcons._();

  // ── ナビゲーション ──
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

  // ── ビジネス・組織 ──
  static const String briefcase = 'assets/ic-briefcase.svg';
  static const String briefcaseFill = 'assets/ic-briefcase-fill.svg';
  static const String award = 'assets/ic-award.svg';
  static const String awardFill = 'assets/ic-award-fill.svg';
  static const String teacher = 'assets/ic-teacher.svg';
  static const String teacherFill = 'assets/ic-teacher-fill.svg';
  static const String hierarchy = 'assets/ic-hierarchy.svg';
  static const String hierarchyFill = 'assets/ic-hierarchy-fill.svg';
  static const String hierarchy2 = 'assets/ic-hierarchy2.svg';
  static const String hierarchy2Fill = 'assets/ic-hierarchy2-fill.svg';

  // ── カレンダー・時間 ──
  static const String calendar = 'assets/ic-calendar.svg';
  static const String calendarFill = 'assets/ic-calendar-fill.svg';
  static const String calendarEdit = 'assets/ic-calendar-edit.svg';
  static const String calendarEditFill = 'assets/ic-calendar-edit-fill.svg';
  static const String calendarSearch = 'assets/ic-calendar-search.svg';
  static const String calendarSearchFill = 'assets/ic-calendar-search-fill.svg';
  static const String calendarTick = 'assets/ic-calendar-tick.svg';
  static const String calendarTickFill = 'assets/ic-calendar-tick-fill.svg';
  static const String clock = 'assets/ic-clock.svg';
  static const String clockFill = 'assets/ic-clock-fill.svg';

  // ── 勤怠 ──
  static const String login = 'assets/ic-login.svg';
  static const String loginFill = 'assets/ic-login-fill.svg';
  static const String logout = 'assets/ic-logout.svg';
  static const String logoutFill = 'assets/ic-logout-fill.svg';
  static const String pause = 'assets/ic-pause.svg';
  static const String pauseFill = 'assets/ic-pause-fill.svg';

  // ── コミュニケーション ──
  static const String sms = 'assets/ic-sms.svg';
  static const String smsFill = 'assets/ic-sms-fill.svg';
  static const String buliding = 'assets/ic-buliding.svg';
  static const String bulidingFill = 'assets/ic-buliding-fill.svg';

  // ── アクション ──
  static const String search = 'assets/ic-search.svg';
  static const String searchFill = 'assets/ic-search-fill.svg';
  static const String send = 'assets/ic-send.svg';
  static const String sendFill = 'assets/ic-send-fill.svg';
  static const String trash = 'assets/ic-trash.svg';
  static const String trashFill = 'assets/ic-trash-fill.svg';
  static const String tickCircle = 'assets/ic-tick-circle.svg';
  static const String tickCircleFill = 'assets/ic-tick-circle-fill.svg';

  // ── コンテンツ ──
  static const String doc = 'assets/ic-doc.svg';
  static const String docFill = 'assets/ic-doc-fill.svg';
  static const String folder = 'assets/ic-folder.svg';
  static const String folderFill = 'assets/ic-folder-fill.svg';
  static const String directbox = 'assets/ic-directbox.svg';
  static const String directboxFill = 'assets/ic-directbox-fill.svg';

  // ── その他 ──
  static const String call = 'assets/ic-call.svg';
  static const String callFill = 'assets/ic-call-fill.svg';
  static const String coffee = 'assets/ic-coffee.svg';
  static const String coffeeFill = 'assets/ic-coffee-fill.svg';
  static const String location = 'assets/ic-location.svg';
  static const String locationFill = 'assets/ic-location-fill.svg';
  static const String calculator = 'assets/ic-calculator.svg';
  static const String calculatorFill = 'assets/ic-calculator-fill.svg';
  static const String data = 'assets/ic-data.svg';
  static const String dataFill = 'assets/ic-data-fill.svg';
  static const String nemuBoard = 'assets/ic-nemu-board.svg';
  static const String nemuBoardFill = 'assets/ic-nemu-board-fill.svg';

  // ── レイアウト ──
  static const String rowHorizontal = 'assets/ic-row-horizontal.svg';
  static const String rowHorizontalFill = 'assets/ic-row-horizontal-fill.svg';
  static const String rowVertical = 'assets/ic-row-vertical.svg';
  static const String rowVerticalFill = 'assets/ic-row-vertical-fill.svg';
  static const String sliderHorizontal = 'assets/ic-slider-horizontal.svg';
  static const String sliderHorizontalFill = 'assets/ic-slider-horizontal-fill.svg';
  static const String sliderHorizontal2 = 'assets/ic-slider-horizontal2.svg';
  static const String sliderHorizontal2Fill = 'assets/ic-slider-horizontal2-fill.svg';
  static const String sliderVertical = 'assets/ic-slider-vertical.svg';
  static const String sliderVerticalFill = 'assets/ic-slider-vertical-fill.svg';
  static const String sliderVertical2 = 'assets/ic-slider-vertical2.svg';
  static const String sliderVertical2Fill = 'assets/ic-slider-vertical2-fill.svg';

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
