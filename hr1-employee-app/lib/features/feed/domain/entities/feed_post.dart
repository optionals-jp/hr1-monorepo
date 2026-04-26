import 'package:flutter/material.dart';

/// フィード投稿のドメインエンティティ。
///
/// 簡易実装のため、現状はメモリ上でのみ保持する（DB 永続化なし）。
class FeedPost {
  const FeedPost({
    required this.id,
    required this.authorInitial,
    required this.authorColor,
    required this.authorName,
    required this.authorRole,
    required this.timeAgo,
    required this.body,
    required this.likes,
    required this.comments,
    this.scope,
    this.tag,
    this.tagColor,
    this.hasImage = false,
  });

  final String id;
  final String authorInitial;
  final Color authorColor;
  final String authorName;
  final String authorRole;
  final String timeAgo;
  final String body;
  final int likes;
  final int comments;
  final String? scope;
  final String? tag;
  final Color? tagColor;
  final bool hasImage;
}
