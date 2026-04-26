import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 汎用セクションヘッダ — タイトル + 任意の trailing アクション。
///
/// 詳細画面・設定画面・各種フォーム等でセクションを区切るのに使う。
/// テキストは小さめ（`AppTextStyles.caption2` ベース、太字 + letter spacing）。
///
/// ```dart
/// SectionHeader(
///   '関連タスク · 3',
///   trailing: InkWell(onTap: ..., child: Text('+ 紐付け')),
/// )
/// ```
class SectionHeader extends StatelessWidget {
  const SectionHeader(
    this.label, {
    super.key,
    this.trailing,
    this.prominent = false,
  });

  final String label;
  final Widget? trailing;

  /// `true` のとき主要セクション向けに `label1` (15pt semibold) で表示。
  /// `false` (default) は補助セクション向けに `caption2` を太字 +
  /// letter-spacing で小さく表示。
  final bool prominent;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.textSecondary(context);
    final style = prominent
        ? AppTextStyles.label1.copyWith(color: color)
        : AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
            color: color,
          );
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}
