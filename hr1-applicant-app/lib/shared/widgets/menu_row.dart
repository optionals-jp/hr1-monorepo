import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';

/// 汎用メニュー行ウィジェット
///
/// 2つの表示パターンをサポート:
/// - **タイトル型**: `title` のみ、または `title` + `subtitle`
/// - **ラベル＋値型**: `label`（小文字ヘッダー）+ `value`（メイン値）
class MenuRow extends StatelessWidget {
  const MenuRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.label,
    this.subtitle,
    this.showChevron = false,
    this.isDestructive = false,
    this.onTap,
  });

  /// アイコン（IconTheme で自動スタイル適用）
  final Widget? icon;

  /// カスタムリーディングウィジェット（icon より優先、IconTheme 非適用）
  final Widget? leading;

  /// メインテキスト（タイトル型の場合）またはメイン値（ラベル型の場合）
  final String title;

  /// 小文字のラベル（title の上に表示）
  final String? label;

  /// サブタイトル（title の下に表示、label と排他）
  final String? subtitle;

  /// シェブロンの表示
  final bool showChevron;

  /// 破壊的アクション（テキスト色を赤に）
  final bool isDestructive;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textColor = isDestructive ? AppColors.error : theme.colorScheme.onSurface;
    final hasLabel = label != null;
    final isEditable = onTap != null;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            if (leading != null) ...[
              leading!,
              const SizedBox(width: 14),
            ] else if (icon != null) ...[
              IconTheme(
                data: IconThemeData(
                  size: 22,
                  color: isDestructive ? AppColors.error : theme.colorScheme.onSurface.withValues(alpha: 0.55),
                ),
                child: icon!,
              ),
              const SizedBox(width: 14),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (hasLabel) ...[
                    Text(
                      label!,
                      style: AppTextStyles.caption.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: isEditable && title == '編集する'
                            ? AppColors.primaryLight
                            : textColor,
                      ),
                    ),
                  ] else ...[
                    Text(
                      title,
                      style: AppTextStyles.bodySmall.copyWith(color: textColor),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: AppTextStyles.caption.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                        ),
                      ),
                  ],
                ],
              ),
            ),
            if (showChevron || (isEditable && hasLabel))
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
          ],
        ),
      ),
    );
  }
}
