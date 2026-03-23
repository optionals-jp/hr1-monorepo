import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// プレゼンスステータス
enum PresenceStatus {
  /// オンライン / 勤務中（緑）
  available,

  /// 離席中 / 休憩中（黄）
  away,

  /// オフライン / 退勤済み（表示なし）
  offline,
}

/// 共通ユーザーアバター — Fluent 2 iOS スタイル
///
/// サイズ指定可能なイニシャルアバター。
/// [presence] を指定すると右下にプレゼンスインジケーターを表示。
class UserAvatar extends StatelessWidget {
  const UserAvatar({
    super.key,
    required this.initial,
    this.color = const Color(0xFF0F6CBD),
    this.size = 48,
    this.imageUrl,
    this.presence,
  });

  /// 表示するイニシャル（1文字）
  final String initial;

  /// 背景色
  final Color color;

  /// アバターのサイズ（幅・高さ）
  final double size;

  /// プロフィール画像URL（指定時はイニシャルの代わりに画像を表示）
  final String? imageUrl;

  /// プレゼンスステータス（null の場合はインジケーター非表示）
  final PresenceStatus? presence;

  @override
  Widget build(BuildContext context) {
    final fontSize = size * 0.38;

    final avatar = Container(
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

    if (presence == null || presence == PresenceStatus.offline) {
      return avatar;
    }

    final dotSize = (size * 0.26).clamp(10.0, 20.0);
    final borderWidth = (size * 0.04).clamp(2.0, 4.0);

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          avatar,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: dotSize,
              height: dotSize,
              decoration: BoxDecoration(
                color: _presenceColor,
                shape: BoxShape.circle,
                border: Border.all(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  width: borderWidth,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color get _presenceColor {
    switch (presence) {
      case PresenceStatus.available:
        return const Color(0xFF0E7A0B);
      case PresenceStatus.away:
        return const Color(0xFFEAA300);
      default:
        return Colors.grey;
    }
  }
}
