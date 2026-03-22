import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';

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
    return SizedBox(
      height: MediaQuery.of(context).size.height * heightFactor,
      child: Scaffold(
        backgroundColor: Colors.transparent,
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
                size: 24,
                color: AppColors.textSecondary,
              ),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
        body: child,
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
