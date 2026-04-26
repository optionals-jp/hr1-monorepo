import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// タップで選択状態をトグルする pill 型 chip。優先度・分類・関連 kind 等の
/// 単一選択 UI で使う。選択時は [color] の塗りつぶし、非選択時は枠線のみ。
class CommonSelectPill extends StatelessWidget {
  const CommonSelectPill({
    super.key,
    required this.label,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color : AppColors.surface(context),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected ? color : AppColors.border(context),
            ),
          ),
          child: Text(
            label,
            style: AppTextStyles.footnote.copyWith(
              fontWeight: FontWeight.w600,
              color: selected ? Colors.white : AppColors.textSecondary(context),
            ),
          ),
        ),
      ),
    );
  }
}
