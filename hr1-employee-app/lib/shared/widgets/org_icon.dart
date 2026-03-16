import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';

/// 企業アイコン — 角丸四角のイニシャルアイコン
class OrgIcon extends StatelessWidget {
  const OrgIcon({
    super.key,
    required this.initial,
    this.size = 28,
    this.color = AppColors.brandSecondary,
    this.borderRadius = 6,
  });

  final String initial;
  final double size;
  final Color color;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final fontSize = size * 0.42;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: Text(
          initial,
          style: AppTextStyles.regular12.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }
}
