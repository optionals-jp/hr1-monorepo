import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:shimmer/shimmer.dart';

/// スケルトンローディングコンテナ
///
/// 子ウィジェット内の `Colors.white` 部分にシマー効果を適用する。
/// 子には [SkeletonBone] や [SkeletonCardBone] を使用する。
///
/// ```dart
/// SkeletonContainer(
///   child: Column(
///     children: [
///       SkeletonBone(width: 80, height: 12),
///       SizedBox(height: 8),
///       SkeletonBone(height: 14),
///     ],
///   ),
/// )
/// ```
class SkeletonContainer extends StatelessWidget {
  const SkeletonContainer({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? AppColors.darkSurfaceTertiary : AppColors.lightBorder,
      highlightColor: isDark
          ? AppColors.darkDivider
          : AppColors.lightSurfaceSecondary,
      child: child,
    );
  }
}

/// スケルトン用の矩形ボーン
class SkeletonBone extends StatelessWidget {
  const SkeletonBone({
    super.key,
    this.width,
    required this.height,
    this.borderRadius = 4,
  });

  final double? width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// スケルトン用の円形ボーン
class SkeletonCircle extends StatelessWidget {
  const SkeletonCircle({super.key, required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
    );
  }
}

/// アイコン＋テキスト行のスケルトン（FAQ カード等）
class SkeletonCardBone extends StatelessWidget {
  const SkeletonCardBone({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      child: Row(
        children: [
          const SkeletonBone(width: 24, height: 24, borderRadius: 6),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                SkeletonBone(height: 14),
                SizedBox(height: 6),
                SkeletonBone(width: 160, height: 14),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
