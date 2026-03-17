import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// 共通ローディングインジケーター（インライン表示用）
///
/// 画面内にローディングを埋め込む場合に使用。
/// 全画面オーバーレイには [Loading.show()] を使用してください。
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key, this.size = 48.0});

  /// インジケーターのサイズ
  final double size;

  /// Lottie アニメーションファイルのパス
  static const String _lottieAsset = 'assets/animations/loading.json';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Lottie.asset(
        _lottieAsset,
        width: size,
        height: size,
        errorBuilder: (context, error, stackTrace) {
          return SizedBox(
            width: size * 0.6,
            height: size * 0.6,
            child: const CircularProgressIndicator(strokeWidth: 2),
          );
        },
      ),
    );
  }
}
