import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

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
        return AlertDialog(
          title: Text(title, style: AppTextStyles.headline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(9999),
          ),
          content: Text(
            message,
            style: AppTextStyles.body2.copyWith(
              color: AppColors.textSecondary(context),
            ),
            textAlign: TextAlign.center,
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.brand,
                      side: const BorderSide(color: AppColors.brand),
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
                      backgroundColor:
                          isDestructive ? AppColors.error : AppColors.brand,
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

  /// 入力ダイアログを表示
  ///
  /// 戻り値は入力された文字列。キャンセル時は null。
  ///
  /// ```dart
  /// final value = await CommonDialog.input(
  ///   context: context,
  ///   title: '名前の変更',
  ///   hintText: '名前を入力',
  ///   initialValue: currentName,
  /// );
  /// ```
  static Future<String?> input({
    required BuildContext context,
    required String title,
    String? hintText,
    String? initialValue,
    String? suffixText,
    String cancelLabel = 'キャンセル',
    String confirmLabel = '保存',
    TextInputType keyboardType = TextInputType.text,
    bool autofocus = true,
  }) async {
    final controller = TextEditingController(text: initialValue);

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(title, style: AppTextStyles.headline),
          content: TextField(
            controller: controller,
            autofocus: autofocus,
            keyboardType: keyboardType,
            style: AppTextStyles.body2,
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(context),
              ),
              suffixText: suffixText,
              filled: true,
              fillColor: AppColors.surfaceTertiary(context),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
            ),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.brand,
                      side: const BorderSide(color: AppColors.brand),
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
                    onPressed: () => Navigator.pop(ctx, controller.text.trim()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.brand,
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

    controller.dispose();
    return result;
  }
}
