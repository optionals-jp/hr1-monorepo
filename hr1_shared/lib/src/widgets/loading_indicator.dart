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
/// ```
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Platform.isIOS
          ? CupertinoActivityIndicator(radius: size / 2)
          : SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                strokeWidth: 1,
                color: AppColors.brand,
              ),
            ),
    );
  }
}
