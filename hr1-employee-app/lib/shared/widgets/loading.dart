import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart' show LoadingIndicator;
import 'package:lottie/lottie.dart';
import '../../core/constants/constants.dart';

/// グローバルローディングオーバーレイ
///
/// 使い方:
/// ```dart
/// Loading.show(context);
/// await someAsyncWork();
/// Loading.dismiss();
/// ```
class Loading {
  Loading._();

  static OverlayEntry? _overlayEntry;
  static bool _isVisible = false;

  /// Lottie アニメーションファイルのパス
  static const String _lottieAsset = 'assets/animations/loading.json';

  /// ローディングオーバーレイを表示
  static void show(BuildContext context) {
    if (_isVisible) return;

    final overlay = Overlay.of(context);
    _overlayEntry = OverlayEntry(builder: (context) => const _LoadingOverlay());
    overlay.insert(_overlayEntry!);
    _isVisible = true;
  }

  /// ローディングオーバーレイを非表示
  static void dismiss() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    _isVisible = false;
  }

  /// 現在表示中かどうか
  static bool get isVisible => _isVisible;
}

class _LoadingOverlay extends StatelessWidget {
  const _LoadingOverlay();

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Material(
        color: AppColors.lightTextPrimary.withValues(alpha: 0.3),
        child: Center(
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(16),
              boxShadow: AppShadows.shadow16,
            ),
            child: Center(
              child: Lottie.asset(
                Loading._lottieAsset,
                width: 56,
                height: 56,
                errorBuilder: (context, error, stackTrace) {
                  return const SizedBox(
                    width: 32,
                    height: 32,
                    child: LoadingIndicator(size: 20),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
