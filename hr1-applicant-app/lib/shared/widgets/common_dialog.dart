import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';

/// 共通ダイアログユーティリティ
class CommonDialog {
  CommonDialog._();

  /// 確認ダイアログを表示
  ///
  /// [isDestructive] が true の場合、確定ボタンが赤色になる。
  ///
  /// ```dart
  /// final confirmed = await CommonDialog.confirm(
  ///   context: context,
  ///   title: '削除',
  ///   message: 'このデータを削除しますか？',
  ///   confirmLabel: '削除',
  ///   isDestructive: true,
  /// );
  /// ```
  static Future<bool> confirm({
    required BuildContext context,
    required String title,
    required String message,
    String cancelLabel = 'キャンセル',
    String confirmLabel = 'OK',
    bool isDestructive = false,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        return AlertDialog(
          title: Text(title, style: AppTextStyles.callout),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          content: Text(
            message,
            style: AppTextStyles.body2.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primaryLight,
                      side: const BorderSide(color: AppColors.primaryLight),
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 40),
                      padding: const EdgeInsets.symmetric(
                        vertical: 8,
                        horizontal: 16,
                      ),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(cancelLabel),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDestructive
                          ? AppColors.error
                          : AppColors.primaryLight,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 40),
                      padding: const EdgeInsets.symmetric(
                        vertical: 8,
                        horizontal: 16,
                      ),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(confirmLabel),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
    return result ?? false;
  }
}
