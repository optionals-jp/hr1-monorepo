import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 円形のチェック表示。完了 / 未完了の状態を [done] で表現する。
/// アクション（タップでトグル）は呼び出し側で `GestureDetector` 等を被せる前提。
class CommonCheckCircle extends StatelessWidget {
  const CommonCheckCircle({
    super.key,
    required this.done,
    this.color = AppColors.successFilled,
    this.size = 18,
  });

  final bool done;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: done ? color : Colors.transparent,
        shape: BoxShape.circle,
        border: Border.all(
          color: done ? color : AppColors.textTertiary(context),
          width: 1.8,
        ),
      ),
      alignment: Alignment.center,
      child: done
          ? Icon(Icons.check, size: size - 6, color: Colors.white)
          : null,
    );
  }
}
