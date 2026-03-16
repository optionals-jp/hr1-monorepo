import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

/// 共通ローディングインジケーター
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key, this.size = 24.0});

  /// インジケーターのサイズ
  final double size;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: size,
        height: size,
        child: const CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(AppColors.brandLight),
        ),
      ),
    );
  }
}
