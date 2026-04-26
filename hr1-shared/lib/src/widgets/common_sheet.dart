import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 共通フルスクリーンボトムシート
///
/// ```dart
/// CommonSheet.show(
///   context: context,
///   title: 'やることを追加',
///   child: MyFormWidget(),
/// );
/// ```
class CommonSheet {
  CommonSheet._();

  /// フルスクリーンのボトムシートを表示
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required Widget child,
    Widget? bottomAction,
    double heightFactor = 1.0,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _CommonSheetContent(
        title: title,
        heightFactor: heightFactor,
        bottomAction: bottomAction,
        child: child,
      ),
    );
  }
}

class _CommonSheetContent extends StatelessWidget {
  const _CommonSheetContent({
    required this.title,
    required this.child,
    required this.heightFactor,
    this.bottomAction,
  });

  final String title;
  final Widget child;
  final double heightFactor;
  final Widget? bottomAction;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    // キーボード表示時は viewInsets 分だけシートを押し上げ、内側では
    // bottom padding でキーボードに隠れないようコンテンツを確保する。
    // 最大は画面の 95% までに制限（AppBar が画面外に出ないようにする）。
    final keyboardInset = media.viewInsets.bottom;
    final maxHeight = media.size.height * 0.95;
    final base = media.size.height * heightFactor;
    final sheetHeight = (base + keyboardInset).clamp(base, maxHeight);
    return SizedBox(
      height: sheetHeight,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        resizeToAvoidBottomInset: false,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
          automaticallyImplyLeading: false,
          title: Text(title),
          actions: [
            IconButton(
              icon: Icon(
                Icons.close_rounded,
                size: AppSpacing.iconMd,
                color: AppColors.textSecondary(context),
              ),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
        body: Padding(
          padding: EdgeInsets.only(bottom: keyboardInset),
          child: child,
        ),
        bottomNavigationBar: bottomAction != null
            ? SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.screenHorizontal,
                    AppSpacing.sm,
                    AppSpacing.screenHorizontal,
                    AppSpacing.md,
                  ),
                  child: bottomAction,
                ),
              )
            : null,
      ),
    );
  }
}
