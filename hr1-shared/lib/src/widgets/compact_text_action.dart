import 'package:flutter/material.dart';
import 'package:hr1_shared/src/constants/app_colors.dart';
import 'package:hr1_shared/src/constants/app_text_styles.dart';
import 'package:hr1_shared/src/widgets/loading_indicator.dart';

/// 最小タップターゲットの「テキスト1語ボタン」共通ウィジェット。
///
/// AppBar actions（"今日", "明細", "保存"）、リスト行内のインライン
/// アクション（"変更"）、フォーム下のリンク（"メールアドレスを変更"）
/// 等で共通利用できる。`TextButton` を個別組み立てして
/// `style: TextButton.styleFrom(...)` で余白を縮める実装の置き換え。
///
/// 視覚仕様:
/// - 12pt SemiBold
/// - 既定色は `AppColors.brand`、`color` で上書き可
/// - 余白 12x6、`tapTargetSize: shrinkWrap`、`minimumSize: zero`
///
/// ```dart
/// AppBar(
///   actions: [
///     CompactTextAction(label: '保存', onPressed: save, loading: isSaving),
///   ],
/// )
/// ```
class CompactTextAction extends StatelessWidget {
  const CompactTextAction({
    super.key,
    required this.label,
    required this.onPressed,
    this.color,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;

  /// ラベルカラー。null の場合は `AppColors.brand` を使用。
  final Color? color;

  /// true の場合、ラベルの代わりに小さなローディングインジケータを表示し、
  /// タップ不可になる。
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: loading ? null : onPressed,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: loading
          ? const SizedBox(
              width: 16,
              height: 16,
              child: LoadingIndicator(size: 16),
            )
          : Text(
              label,
              style: AppTextStyles.caption1.copyWith(
                color: color ?? AppColors.brand,
                fontWeight: FontWeight.w600,
              ),
            ),
    );
  }
}
