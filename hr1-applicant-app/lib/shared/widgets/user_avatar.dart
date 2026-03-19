import 'package:flutter/material.dart';
import '../../core/constants/app_text_styles.dart';

/// 共通ユーザーアバター
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.initial,
    this.color = const Color(0xFF0F6CBD),
    this.size = 48,
    this.imageUrl,
  });

  /// 表示するイニシャル（1文字）
  final String initial;

  /// 背景色
  final Color color;

  /// アバターのサイズ（幅・高さ）
  final double size;

  /// プロフィール画像URL（指定時はイニシャルの代わりに画像を表示）
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    final fontSize = size * 0.38;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        image: imageUrl != null
            ? DecorationImage(image: NetworkImage(imageUrl!), fit: BoxFit.cover)
            : null,
      ),
      child: imageUrl == null
          ? Center(
              child: Text(
                initial,
                style: AppTextStyles.caption1.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: fontSize,
                ),
              ),
            )
          : null,
    );
  }
}
