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
  static const String _personalcard = 'assets/ic-personalcard.svg';
  static const String _personalcardFill = 'assets/ic-personalcard-fill.svg';
  static const String _briefcase = 'assets/ic-briefcase.svg';
  static const String _briefcaseFill = 'assets/ic-briefcase-fill.svg';
  static const String _award = 'assets/ic-award.svg';
  static const String _awardFill = 'assets/ic-award-fill.svg';
  static const String _teacher = 'assets/ic-teacher.svg';
  static const String _teacherFill = 'assets/ic-teacher-fill.svg';
  static const String _hierarchy = 'assets/ic-hierarchy.svg';
  static const String _hierarchyFill = 'assets/ic-hierarchy-fill.svg';
  static const String _hierarchy2 = 'assets/ic-hierarchy2.svg';
  static const String _hierarchy2Fill = 'assets/ic-hierarchy2-fill.svg';
  static const String _calendar = 'assets/ic-calendar.svg';
  static const String _calendarFill = 'assets/ic-calendar-fill.svg';
  static const String _calendarEdit = 'assets/ic-calendar-edit.svg';
  static const String _calendarEditFill = 'assets/ic-calendar-edit-fill.svg';
  static const String _calendarSearch = 'assets/ic-calendar-search.svg';
  static const String _calendarSearchFill = 'assets/ic-calendar-search-fill.svg';
  static const String _calendarTick = 'assets/ic-calendar-tick.svg';
  static const String _calendarTickFill = 'assets/ic-calendar-tick-fill.svg';
  static const String _clock = 'assets/ic-clock.svg';
  static const String _clockFill = 'assets/ic-clock-fill.svg';
  static const String _login = 'assets/ic-login.svg';
  static const String _loginFill = 'assets/ic-login-fill.svg';
  static const String _logout = 'assets/ic-logout.svg';
  static const String _logoutFill = 'assets/ic-logout-fill.svg';
  static const String _pause = 'assets/ic-pause.svg';
  static const String _pauseFill = 'assets/ic-pause-fill.svg';
  static const String _sms = 'assets/ic-sms.svg';
  static const String _smsFill = 'assets/ic-sms-fill.svg';
  static const String _buliding = 'assets/ic-buliding.svg';
  static const String _bulidingFill = 'assets/ic-buliding-fill.svg';
  static const String _search = 'assets/ic-search.svg';
  static const String _searchFill = 'assets/ic-search-fill.svg';
  static const String _send = 'assets/ic-send.svg';
  static const String _sendFill = 'assets/ic-send-fill.svg';
  static const String _trash = 'assets/ic-trash.svg';
  static const String _trashFill = 'assets/ic-trash-fill.svg';
  static const String _tickCircle = 'assets/ic-tick-circle.svg';
  static const String _tickCircleFill = 'assets/ic-tick-circle-fill.svg';
  static const String _doc = 'assets/ic-doc.svg';
  static const String _docFill = 'assets/ic-doc-fill.svg';
  static const String _folder = 'assets/ic-folder.svg';
  static const String _folderFill = 'assets/ic-folder-fill.svg';
  static const String _directbox = 'assets/ic-directbox.svg';
  static const String _directboxFill = 'assets/ic-directbox-fill.svg';
  static const String _call = 'assets/ic-call.svg';
  static const String _callFill = 'assets/ic-call-fill.svg';
  static const String _coffee = 'assets/ic-coffee.svg';
  static const String _coffeeFill = 'assets/ic-coffee-fill.svg';
  static const String _location = 'assets/ic-location.svg';
  static const String _locationFill = 'assets/ic-location-fill.svg';
  static const String _calculator = 'assets/ic-calculator.svg';
  static const String _calculatorFill = 'assets/ic-calculator-fill.svg';
  static const String _data = 'assets/ic-data.svg';
  static const String _dataFill = 'assets/ic-data-fill.svg';
  static const String _nemuBoard = 'assets/ic-nemu-board.svg';
  static const String _nemuBoardFill = 'assets/ic-nemu-board-fill.svg';
  static const String _rowHorizontal = 'assets/ic-row-horizontal.svg';
  static const String _rowHorizontalFill = 'assets/ic-row-horizontal-fill.svg';
  static const String _rowVertical = 'assets/ic-row-vertical.svg';
  static const String _rowVerticalFill = 'assets/ic-row-vertical-fill.svg';
  static const String _sliderHorizontal = 'assets/ic-slider-horizontal.svg';
  static const String _sliderHorizontalFill = 'assets/ic-slider-horizontal-fill.svg';
  static const String _sliderHorizontal2 = 'assets/ic-slider-horizontal2.svg';
  static const String _sliderHorizontal2Fill = 'assets/ic-slider-horizontal2-fill.svg';
  static const String _sliderVertical = 'assets/ic-slider-vertical.svg';
  static const String _sliderVerticalFill = 'assets/ic-slider-vertical-fill.svg';
  static const String _sliderVertical2 = 'assets/ic-slider-vertical2.svg';
  static const String _sliderVertical2Fill = 'assets/ic-slider-vertical2-fill.svg';

  // ── ナビゲーション ──
  static Widget home({double size = 24, Color? color}) => _svg(_home, size: size, color: color);
  static Widget homeFill({double size = 24, Color? color}) => _svg(_homeFill, size: size, color: color);
  static Widget note({double size = 24, Color? color}) => _svg(_note, size: size, color: color);
  static Widget noteFill({double size = 24, Color? color}) => _svg(_noteFill, size: size, color: color);
  static Widget notification({double size = 24, Color? color}) => _svg(_notification, size: size, color: color);
  static Widget notificationFill({double size = 24, Color? color}) => _svg(_notificationFill, size: size, color: color);
  static Widget setting({double size = 24, Color? color}) => _svg(_setting, size: size, color: color);
  static Widget settingFill({double size = 24, Color? color}) => _svg(_settingFill, size: size, color: color);
  static Widget user({double size = 24, Color? color}) => _svg(_user, size: size, color: color);
  static Widget userFill({double size = 24, Color? color}) => _svg(_userFill, size: size, color: color);

  // ── ビジネス・組織 ──
  static Widget personalcard({double size = 24, Color? color}) => _svg(_personalcard, size: size, color: color);
  static Widget personalcardFill({double size = 24, Color? color}) => _svg(_personalcardFill, size: size, color: color);
  static Widget briefcase({double size = 24, Color? color}) => _svg(_briefcase, size: size, color: color);
  static Widget briefcaseFill({double size = 24, Color? color}) => _svg(_briefcaseFill, size: size, color: color);
  static Widget award({double size = 24, Color? color}) => _svg(_award, size: size, color: color);
  static Widget awardFill({double size = 24, Color? color}) => _svg(_awardFill, size: size, color: color);
  static Widget teacher({double size = 24, Color? color}) => _svg(_teacher, size: size, color: color);
  static Widget teacherFill({double size = 24, Color? color}) => _svg(_teacherFill, size: size, color: color);
  static Widget hierarchy({double size = 24, Color? color}) => _svg(_hierarchy, size: size, color: color);
  static Widget hierarchyFill({double size = 24, Color? color}) => _svg(_hierarchyFill, size: size, color: color);
  static Widget hierarchy2({double size = 24, Color? color}) => _svg(_hierarchy2, size: size, color: color);
  static Widget hierarchy2Fill({double size = 24, Color? color}) => _svg(_hierarchy2Fill, size: size, color: color);

  // ── カレンダー・時間 ──
  static Widget calendar({double size = 24, Color? color}) => _svg(_calendar, size: size, color: color);
  static Widget calendarFill({double size = 24, Color? color}) => _svg(_calendarFill, size: size, color: color);
  static Widget calendarEdit({double size = 24, Color? color}) => _svg(_calendarEdit, size: size, color: color);
  static Widget calendarEditFill({double size = 24, Color? color}) => _svg(_calendarEditFill, size: size, color: color);
  static Widget calendarSearch({double size = 24, Color? color}) => _svg(_calendarSearch, size: size, color: color);
  static Widget calendarSearchFill({double size = 24, Color? color}) => _svg(_calendarSearchFill, size: size, color: color);
  static Widget calendarTick({double size = 24, Color? color}) => _svg(_calendarTick, size: size, color: color);
  static Widget calendarTickFill({double size = 24, Color? color}) => _svg(_calendarTickFill, size: size, color: color);
  static Widget clock({double size = 24, Color? color}) => _svg(_clock, size: size, color: color);
  static Widget clockFill({double size = 24, Color? color}) => _svg(_clockFill, size: size, color: color);

  // ── 勤怠 ──
  static Widget login({double size = 24, Color? color}) => _svg(_login, size: size, color: color);
  static Widget loginFill({double size = 24, Color? color}) => _svg(_loginFill, size: size, color: color);
  static Widget logout({double size = 24, Color? color}) => _svg(_logout, size: size, color: color);
  static Widget logoutFill({double size = 24, Color? color}) => _svg(_logoutFill, size: size, color: color);
  static Widget pause({double size = 24, Color? color}) => _svg(_pause, size: size, color: color);
  static Widget pauseFill({double size = 24, Color? color}) => _svg(_pauseFill, size: size, color: color);

  // ── コミュニケーション ──
  static Widget sms({double size = 24, Color? color}) => _svg(_sms, size: size, color: color);
  static Widget smsFill({double size = 24, Color? color}) => _svg(_smsFill, size: size, color: color);
  static Widget buliding({double size = 24, Color? color}) => _svg(_buliding, size: size, color: color);
  static Widget bulidingFill({double size = 24, Color? color}) => _svg(_bulidingFill, size: size, color: color);

  // ── アクション ──
  static Widget search({double size = 24, Color? color}) => _svg(_search, size: size, color: color);
  static Widget searchFill({double size = 24, Color? color}) => _svg(_searchFill, size: size, color: color);
  static Widget send({double size = 24, Color? color}) => _svg(_send, size: size, color: color);
  static Widget sendFill({double size = 24, Color? color}) => _svg(_sendFill, size: size, color: color);
  static Widget trash({double size = 24, Color? color}) => _svg(_trash, size: size, color: color);
  static Widget trashFill({double size = 24, Color? color}) => _svg(_trashFill, size: size, color: color);
  static Widget tickCircle({double size = 24, Color? color}) => _svg(_tickCircle, size: size, color: color);
  static Widget tickCircleFill({double size = 24, Color? color}) => _svg(_tickCircleFill, size: size, color: color);

  // ── コンテンツ ──
  static Widget doc({double size = 24, Color? color}) => _svg(_doc, size: size, color: color);
  static Widget docFill({double size = 24, Color? color}) => _svg(_docFill, size: size, color: color);
  static Widget folder({double size = 24, Color? color}) => _svg(_folder, size: size, color: color);
  static Widget folderFill({double size = 24, Color? color}) => _svg(_folderFill, size: size, color: color);
  static Widget directbox({double size = 24, Color? color}) => _svg(_directbox, size: size, color: color);
  static Widget directboxFill({double size = 24, Color? color}) => _svg(_directboxFill, size: size, color: color);

  // ── その他 ──
  static Widget call({double size = 24, Color? color}) => _svg(_call, size: size, color: color);
  static Widget callFill({double size = 24, Color? color}) => _svg(_callFill, size: size, color: color);
  static Widget coffee({double size = 24, Color? color}) => _svg(_coffee, size: size, color: color);
  static Widget coffeeFill({double size = 24, Color? color}) => _svg(_coffeeFill, size: size, color: color);
  static Widget location({double size = 24, Color? color}) => _svg(_location, size: size, color: color);
  static Widget locationFill({double size = 24, Color? color}) => _svg(_locationFill, size: size, color: color);
  static Widget calculator({double size = 24, Color? color}) => _svg(_calculator, size: size, color: color);
  static Widget calculatorFill({double size = 24, Color? color}) => _svg(_calculatorFill, size: size, color: color);
  static Widget data({double size = 24, Color? color}) => _svg(_data, size: size, color: color);
  static Widget dataFill({double size = 24, Color? color}) => _svg(_dataFill, size: size, color: color);
  static Widget nemuBoard({double size = 24, Color? color}) => _svg(_nemuBoard, size: size, color: color);
  static Widget nemuBoardFill({double size = 24, Color? color}) => _svg(_nemuBoardFill, size: size, color: color);

  // ── レイアウト ──
  static Widget rowHorizontal({double size = 24, Color? color}) => _svg(_rowHorizontal, size: size, color: color);
  static Widget rowHorizontalFill({double size = 24, Color? color}) => _svg(_rowHorizontalFill, size: size, color: color);
  static Widget rowVertical({double size = 24, Color? color}) => _svg(_rowVertical, size: size, color: color);
  static Widget rowVerticalFill({double size = 24, Color? color}) => _svg(_rowVerticalFill, size: size, color: color);
  static Widget sliderHorizontal({double size = 24, Color? color}) => _svg(_sliderHorizontal, size: size, color: color);
  static Widget sliderHorizontalFill({double size = 24, Color? color}) => _svg(_sliderHorizontalFill, size: size, color: color);
  static Widget sliderHorizontal2({double size = 24, Color? color}) => _svg(_sliderHorizontal2, size: size, color: color);
  static Widget sliderHorizontal2Fill({double size = 24, Color? color}) => _svg(_sliderHorizontal2Fill, size: size, color: color);
  static Widget sliderVertical({double size = 24, Color? color}) => _svg(_sliderVertical, size: size, color: color);
  static Widget sliderVerticalFill({double size = 24, Color? color}) => _svg(_sliderVerticalFill, size: size, color: color);
  static Widget sliderVertical2({double size = 24, Color? color}) => _svg(_sliderVertical2, size: size, color: color);
  static Widget sliderVertical2Fill({double size = 24, Color? color}) => _svg(_sliderVertical2Fill, size: size, color: color);

  /// アセットパスからSVGウィジェットを生成（内部ヘルパー）
  ///
  /// [color] 未指定時はテーマの `onSurface` を使用
  /// （ライトモード → 黒系、ダークモード → 白系）
  static Widget _svg(
    String assetPath, {
    double size = 24,
    Color? color,
  }) {
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
  static Widget svg(
    String assetPath, {
    double size = 24,
    Color? color,
  }) {
    return _svg(assetPath, size: size, color: color);
  }
}
