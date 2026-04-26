import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 共通ローディングインジケーター
///
/// - iOS: CupertinoActivityIndicator
/// - Android: CircularProgressIndicator（brand）
///
/// ```dart
/// // デフォルト（20px）
/// LoadingIndicator()
///
/// // インライン（ボタン内、リスト末尾等）
/// LoadingIndicator(size: 20)
///
/// // 色を上書き（暗い背景のボタン内など）
/// LoadingIndicator(size: 14, color: Colors.white)
/// ```
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key, this.size = 20, this.color});

  final double size;

  /// インジケータの色。null の場合は brand カラー（iOS は OS デフォルト）。
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Platform.isIOS
          ? CupertinoActivityIndicator(radius: size / 2, color: color)
          : SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                strokeWidth: 1,
                color: color ?? AppColors.brand,
              ),
            ),
    );
  }
}
