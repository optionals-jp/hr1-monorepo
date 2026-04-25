import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 共通ボタンコンポーネント — Fluent 2 iOS スタイル
///
/// - [filled] が true → 塗りつぶし、false → アウトライン（デフォルト）
/// - [loading] が true → ボタン内にローディング表示、タップ不可
/// - [enabled] が false → 非活性表示、タップ不可
///
/// ```dart
/// // Filled（デフォルト）
/// CommonButton(
///   onPressed: _submit,
///   child: const Text('送信'),
/// )
///
/// // Outline
/// CommonButton.outline(
///   onPressed: _submit,
///   child: const Text('送信'),
/// )
/// ```
class CommonButton extends StatelessWidget {
  const CommonButton({
    super.key,
    required this.onPressed,
    this.loading = false,
    this.enabled = true,
    this.filled = true,
    required this.child,
    this.style,
  });

  const CommonButton.outline({
    super.key,
    required this.onPressed,
    this.loading = false,
    this.enabled = true,
    required this.child,
    this.style,
  }) : filled = false;

  final VoidCallback? onPressed;
  final bool loading;
  final bool enabled;
  final bool filled;
  final Widget child;
  final ButtonStyle? style;

  static final _baseTextStyle = GoogleFonts.notoSansJp(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
  );

  static const _baseShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(12)),
  );

  static const _baseSize = Size(double.infinity, 44);

  static final ButtonStyle _outlineStyle =
      OutlinedButton.styleFrom(
        foregroundColor: AppColors.brand,
        disabledForegroundColor: AppColors.lightTextTertiary,
        minimumSize: _baseSize,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: _baseShape,
        elevation: 0,
        textStyle: _baseTextStyle,
      ).copyWith(
        side: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.disabled)) {
            return const BorderSide(
              color: AppColors.lightTextTertiary,
              width: 0.5,
            );
          }
          return const BorderSide(color: AppColors.brand, width: 1);
        }),
      );

  static final ButtonStyle _filledStyle = ElevatedButton.styleFrom(
    backgroundColor: AppColors.brand,
    foregroundColor: Colors.white,
    disabledBackgroundColor: AppColors.brand.withValues(alpha: 0.4),
    disabledForegroundColor: Colors.white.withValues(alpha: 0.6),
    minimumSize: _baseSize,
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
    shape: _baseShape,
    elevation: 0,
    textStyle: _baseTextStyle,
  );

  @override
  Widget build(BuildContext context) {
    final isDisabled = !enabled || loading;
    final loadingColor = filled ? Colors.white : AppColors.lightTextTertiary;
    final loadingChild = SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: loadingColor),
    );

    if (filled) {
      return ElevatedButton(
        onPressed: isDisabled ? null : onPressed,
        style: style ?? _filledStyle,
        child: loading ? loadingChild : child,
      );
    }

    return OutlinedButton(
      onPressed: isDisabled ? null : onPressed,
      style: style ?? _outlineStyle,
      child: loading ? loadingChild : child,
    );
  }
}
