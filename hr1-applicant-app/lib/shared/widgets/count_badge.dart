import 'package:flutter/material.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';

/// 未読件数などを丸いバッジで表示するウィジェット
class CountBadge extends StatelessWidget {
  const CountBadge({
    super.key,
    required this.count,
    this.color,
    this.size = 18,
  });

  final int count;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : '$count';
    return Container(
      constraints: BoxConstraints(minWidth: size, minHeight: size),
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: color ?? AppColors.error,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          label,
          style: AppTextStyles.caption2.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
