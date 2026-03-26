import 'package:flutter/material.dart';
import 'package:hr1_shared/src/constants/app_spacing.dart';

/// 共通 Scaffold — 全画面で使用する基底 Scaffold
///
/// 標準の [Scaffold] をラップし、以下の共通処理を提供する:
/// - 余白タップでキーボードを閉じる
/// - [bottomAction] で下部固定アクションボタンを SafeArea + 余白付きで配置
///
/// ```dart
/// CommonScaffold(
///   appBar: AppBar(title: const Text('タイトル')),
///   body: const Center(child: Text('内容')),
///   bottomAction: CommonButton(
///     onPressed: () {},
///     child: const Text('送信'),
///   ),
/// )
/// ```
class CommonScaffold extends StatelessWidget {
  const CommonScaffold({
    super.key,
    this.appBar,
    this.body,
    this.floatingActionButton,
    this.floatingActionButtonLocation,
    this.bottomNavigationBar,
    this.bottomAction,
    this.bottomSheet,
    this.backgroundColor,
    this.resizeToAvoidBottomInset,
    this.extendBody = false,
    this.extendBodyBehindAppBar = false,
  });

  final PreferredSizeWidget? appBar;
  final Widget? body;
  final Widget? floatingActionButton;
  final FloatingActionButtonLocation? floatingActionButtonLocation;
  final Widget? bottomNavigationBar;

  /// 下部固定アクション。SafeArea + 標準余白で自動ラップされる。
  final Widget? bottomAction;

  final Widget? bottomSheet;
  final Color? backgroundColor;
  final bool? resizeToAvoidBottomInset;
  final bool extendBody;
  final bool extendBodyBehindAppBar;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        appBar: appBar,
        body: body,
        floatingActionButton: floatingActionButton,
        floatingActionButtonLocation: floatingActionButtonLocation,
        bottomNavigationBar: bottomAction != null
            ? SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenHorizontal,
                    AppSpacing.md,
                    AppSpacing.screenHorizontal,
                    AppSpacing.md,
                  ),
                  child: bottomAction,
                ),
              )
            : bottomNavigationBar,
        bottomSheet: bottomSheet,
        backgroundColor: backgroundColor,
        resizeToAvoidBottomInset: resizeToAvoidBottomInset,
        extendBody: extendBody,
        extendBodyBehindAppBar: extendBodyBehindAppBar,
      ),
    );
  }
}
