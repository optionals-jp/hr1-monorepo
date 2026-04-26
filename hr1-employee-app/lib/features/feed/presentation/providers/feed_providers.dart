import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/feed/domain/entities/feed_post.dart';

/// フィード投稿一覧コントローラ。
///
/// 簡易実装のため初期モックデータを返し、`add` で先頭に追加する
/// メモリ上のリストを管理する。
class FeedListController extends AutoDisposeNotifier<List<FeedPost>> {
  @override
  List<FeedPost> build() => List<FeedPost>.from(_initialPosts);

  void add(FeedPost post) {
    state = [post, ...state];
  }
}

final feedListProvider =
    AutoDisposeNotifierProvider<FeedListController, List<FeedPost>>(
      FeedListController.new,
    );

/// 投稿 ID から該当の投稿を 1 件返す。詳細画面で使う。
final feedPostByIdProvider = Provider.autoDispose.family<FeedPost?, String>((
  ref,
  id,
) {
  final posts = ref.watch(feedListProvider);
  for (final p in posts) {
    if (p.id == id) return p;
  }
  return null;
});

const _initialPosts = <FeedPost>[
  FeedPost(
    id: 'seed-1',
    authorInitial: 'Y',
    authorColor: Color(0xFF115EA3),
    authorName: '山田 健司',
    authorRole: 'CEO',
    timeAgo: '2時間前',
    scope: '全社',
    body:
        '第1四半期のOKR達成、本当にお疲れ様でした。特にHR'
        'プロダクト部の皆さん、ユーザー数が前年比180%に到'
        '達したこと、心から感謝しています。引き続きよろしく'
        'お願いします。',
    likes: 142,
    comments: 18,
  ),
  FeedPost(
    id: 'seed-2',
    authorInitial: 'S',
    authorColor: Color(0xFFC04D4D),
    authorName: '佐藤 由香',
    authorRole: 'シニアUXデザイナー',
    timeAgo: '4時間前',
    tag: 'デザイン',
    tagColor: Color(0xFFE2807B),
    body:
        '新しいデザインシステム "Axis DS 2.0" の全社展開が完'
        '了しました。Figmaライブラリは#design-systemチャン'
        'ネルから参照してください。質問歓迎です。',
    likes: 87,
    comments: 24,
    hasImage: true,
  ),
  FeedPost(
    id: 'seed-3',
    authorInitial: '人',
    authorColor: Color(0xFF0E7A0B),
    authorName: '人事部',
    authorRole: 'HR Office',
    timeAgo: '昨日',
    scope: '全社',
    tag: '健康',
    tagColor: Color(0xFF0E7A0B),
    body:
        '健康診断の予約受付を開始しました。5月末までに必ず予'
        '約をお願いします。マイページの「健康診断」より受付可'
        '能です。',
    likes: 56,
    comments: 9,
  ),
  FeedPost(
    id: 'seed-4',
    authorInitial: 'T',
    authorColor: Color(0xFF8764B8),
    authorName: '田中 真理子',
    authorRole: 'プロダクトマネージャー',
    timeAgo: '昨日',
    tag: 'PM',
    tagColor: Color(0xFF8764B8),
    body:
        'Q2 のロードマップを #pm-team で共有しました。優先順'
        '位については引き続き議論しましょう。来週の sprint '
        'planning までにフィードバックをお願いします。',
    likes: 32,
    comments: 12,
  ),
  FeedPost(
    id: 'seed-5',
    authorInitial: 'I',
    authorColor: Color(0xFFBC4B09),
    authorName: '情報システム部',
    authorRole: 'IT Operations',
    timeAgo: '2日前',
    scope: '全社',
    tag: 'IT',
    tagColor: Color(0xFFBC4B09),
    body:
        '4/26（土）22:00〜翌2:00、社内ネットワーク機器の定期'
        'メンテナンスを実施します。VPNが一時的に利用できなく'
        'なります。',
    likes: 18,
    comments: 4,
  ),
  FeedPost(
    id: 'seed-6',
    authorInitial: 'K',
    authorColor: Color(0xFF115EA3),
    authorName: '小林 大樹',
    authorRole: 'エンジニアリングマネージャー',
    timeAgo: '3日前',
    tag: '開発',
    tagColor: Color(0xFF115EA3),
    body:
        'モバイルアプリのリリース v3.2 が完了しました。新機'
        '能・改善点はリリースノートをご確認ください。フィード'
        'バックは #mobile-feedback まで。',
    likes: 64,
    comments: 7,
  ),
];
