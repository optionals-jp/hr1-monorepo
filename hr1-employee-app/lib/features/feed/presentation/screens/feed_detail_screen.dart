import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/feed/presentation/providers/feed_providers.dart';
import 'package:hr1_employee_app/features/feed/presentation/widgets/feed_post_card.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// フィード投稿詳細画面 — 一覧から投稿カードをタップして遷移する。
///
/// シンプル実装: タイトルバー + [FeedPostCard] を全文表示するのみ。
/// コメント欄など本格的な機能は将来追加予定。
class FeedDetailScreen extends ConsumerWidget {
  const FeedDetailScreen({super.key, this.postId});

  final String? postId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = postId ?? '';
    final post = ref.watch(feedPostByIdProvider(id));

    return CommonScaffold(
      backgroundColor: AppColors.surface(context),
      appBar: AppBar(
        title: Text(
          '投稿',
          style: AppTextStyles.title2.copyWith(
            color: AppColors.textPrimary(context),
          ),
        ),
        centerTitle: false,
        backgroundColor: AppColors.surface(context),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: post == null
          ? const ErrorState(message: '投稿が見つかりません')
          : ListView(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              children: [FeedPostCard(post: post)],
            ),
    );
  }
}
