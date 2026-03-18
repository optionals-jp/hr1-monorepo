import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

/// 共通ローディングインジケーター（インライン表示用）
///
/// 画面内にローディングを埋め込む場合に使用。
/// 全画面オーバーレイには [Loading.show()] を使用してください。
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key, this.size, this.width = 120.0});

  /// インライン用の小さいサイズ（指定時は CircularProgressIndicator を使用）
  final double? size;

  /// Lottie アニメーションの幅（高さはアスペクト比から自動計算）
  final double width;

  /// Lottie アニメーションファイルのパス
  static const String _lottieAsset = 'assets/animations/loading.json';

  @override
  Widget build(BuildContext context) {
    // size が指定された場合はインライン用の小さいインジケーター
    if (size != null) {
      return Center(
        child: SizedBox(
          width: size,
          height: size,
          child: const CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    return Center(
      child: Lottie.asset(
        _lottieAsset,
        width: width,
        errorBuilder: (context, error, stackTrace) {
          return const SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(strokeWidth: 2),
          );
        },
      ),
    );
  }
}
