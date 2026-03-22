import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';
import 'common_button.dart';

/// 共通エラー表示ウィジェット
///
/// ```dart
/// // 再試行ボタン付き
/// ErrorState(
///   onRetry: () => ref.invalidate(someProvider),
/// )
///
/// // カスタムメッセージ
/// ErrorState(
///   message: 'データの取得に失敗しました',
///   onRetry: () => ref.invalidate(someProvider),
/// )
/// ```
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    this.message = '読み込みに失敗しました',
    this.icon = Icons.error_outline_rounded,
    this.onRetry,
    this.retryLabel = '再試行',
  });

  final String message;
  final IconData icon;
  final VoidCallback? onRetry;
  final String retryLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 48,
              color: AppColors.textTertiaryOf(theme.brightness),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              message,
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondaryOf(theme.brightness),
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.lg),
              CommonButton.outline(onPressed: onRetry, child: Text(retryLabel)),
            ],
          ],
        ),
      ),
    );
  }
}
