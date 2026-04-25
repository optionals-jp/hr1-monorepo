import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 期限バッジ — `due` 日付を `M/d` 形式で表示し、`today` 基準で色分け。
/// - 期限切れ: [AppColors.danger]
/// - 当日: [AppColors.warningFilled]
/// - 将来: [AppColors.textSecondary]
///
/// `today` を引数で受けるのは Riverpod を持たない `hr1_shared` で利用可能に
/// するため。呼出側でアプリの「今日」プロバイダを参照して渡す。
class CommonDueBadge extends StatelessWidget {
  const CommonDueBadge({super.key, required this.due, required this.today});

  final DateTime due;
  final DateTime today;

  /// ISO 文字列 (`yyyy-MM-dd`) を渡したい場合の便利 factory。null / フォーマット
  /// 不正なら [SizedBox.shrink] を返すので呼出側の null guard が不要。
  static Widget fromIso(String? iso, {required DateTime today}) {
    if (iso == null || iso.length < 10) return const SizedBox.shrink();
    final parsed = DateTime.tryParse(iso.substring(0, 10));
    if (parsed == null) return const SizedBox.shrink();
    return CommonDueBadge(due: parsed, today: today);
  }

  @override
  Widget build(BuildContext context) {
    final Color color;
    if (due.isBefore(today)) {
      color = AppColors.danger;
    } else if (due.isAtSameMomentAs(today)) {
      color = AppColors.warningFilled;
    } else {
      color = AppColors.textSecondary(context);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.access_time_rounded, size: 12, color: color),
        const SizedBox(width: 3),
        Text(
          '${due.month}/${due.day}',
          style: AppTextStyles.caption2.copyWith(
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}
