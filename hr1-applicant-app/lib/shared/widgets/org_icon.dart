import 'package:flutter/material.dart';
import '../../core/constants/constants.dart';

/// 企業アイコン — 角丸四角のイニシャルアイコン
///
/// ```dart
/// OrgIcon(initial: '株', size: 32)
/// OrgIcon(initial: 'T', size: 44, color: Colors.indigo)
/// ```
class OrgIcon extends StatelessWidget {
  const OrgIcon({
    super.key,
    required this.initial,
    this.size = 32,
    this.color,
    this.borderRadius = 8,
  });

  final String initial;
  final double size;
  final Color? color;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    final bgColor = color ?? AppColors.primaryLight;
    final fontSize = size * 0.42;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: Text(
          initial,
          style: AppTextStyles.caption1.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }
}
