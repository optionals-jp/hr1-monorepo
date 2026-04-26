import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// インライン通知の重要度。背景・文字色・既定アイコンを切り替える。
enum CommonNoticeSeverity { info, warning, danger, success }

/// インライン通知バナー。
///
/// フォーム下の補足、カード内の注意書き、リスト先頭の案内など、画面文脈に
/// 埋め込む軽量な注意書き向けの共通ウィジェット。Snackbar/Dialog のような
/// 一時 UI ではなく、ページレイアウトに常駐する想定。
///
/// - [severity] で配色・既定アイコンを決定し、ライト/ダーク両モードに対応する。
/// - [icon] で既定アイコンを上書き可能。
/// - [title] を指定すると太字行が本文の上に乗る。
class CommonInlineNotice extends StatelessWidget {
  const CommonInlineNotice({
    super.key,
    required this.message,
    this.title,
    this.severity = CommonNoticeSeverity.info,
    this.icon,
  });

  final String message;
  final String? title;
  final CommonNoticeSeverity severity;

  /// 既定アイコンを上書きしたい場合のみ指定。
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tone = _NoticeTone.of(severity, context);
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: tone.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: tone.border, width: 0.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon ?? tone.defaultIcon, size: 20, color: tone.iconColor),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) ...[
                  Text(
                    title!,
                    style: AppTextStyles.label1.copyWith(color: tone.textColor),
                  ),
                  const SizedBox(height: 2),
                ],
                Text(
                  message,
                  style: AppTextStyles.body2.copyWith(color: tone.textColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoticeTone {
  const _NoticeTone({
    required this.background,
    required this.border,
    required this.iconColor,
    required this.textColor,
    required this.defaultIcon,
  });

  final Color background;
  final Color border;
  final Color iconColor;
  final Color textColor;
  final IconData defaultIcon;

  factory _NoticeTone.of(CommonNoticeSeverity severity, BuildContext context) {
    final dark = AppColors.isDark(context);
    switch (severity) {
      case CommonNoticeSeverity.info:
        return _NoticeTone(
          background: dark
              ? AppColors.brandTintBgDark
              : AppColors.brandTintBgLight,
          border: AppColors.brand.withValues(alpha: 0.25),
          iconColor: AppColors.brand,
          textColor: dark
              ? AppColors.brandTintFgDark
              : AppColors.brandTintFgLight,
          defaultIcon: Icons.info_outline_rounded,
        );
      case CommonNoticeSeverity.warning:
        return _NoticeTone(
          background: dark
              ? AppColors.warningTintBgDark
              : AppColors.warningTintBgLight,
          border: AppColors.warningFilled.withValues(alpha: 0.25),
          iconColor: AppColors.warningFilled,
          textColor: dark ? AppColors.warningTintFgDark : AppColors.warning,
          defaultIcon: Icons.warning_amber_rounded,
        );
      case CommonNoticeSeverity.danger:
        return _NoticeTone(
          background: dark
              ? AppColors.dangerTintBgDark
              : AppColors.dangerTintBgLight,
          border: AppColors.danger.withValues(alpha: 0.25),
          iconColor: AppColors.danger,
          textColor: dark
              ? AppColors.dangerTintFgDark
              : AppColors.dangerTintFgLight,
          defaultIcon: Icons.error_outline_rounded,
        );
      case CommonNoticeSeverity.success:
        return _NoticeTone(
          background: dark
              ? AppColors.successTintBgDark
              : AppColors.successTintBgLight,
          border: AppColors.success.withValues(alpha: 0.25),
          iconColor: AppColors.success,
          textColor: dark
              ? AppColors.successTintFgDark
              : AppColors.successTintFgLight,
          defaultIcon: Icons.check_circle_outline_rounded,
        );
    }
  }
}
