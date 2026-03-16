import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../domain/entities/message_thread.dart';
import '../providers/messages_providers.dart';

/// メッセージ画面 — Teams チャットリストスタイル
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final threadsAsync = ref.watch(messageThreadsProvider);
    final theme = Theme.of(context);

    return Column(
      children: [
        // 検索バー（Teams チャット画面上部の検索バー）
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: GestureDetector(
            onTap: () {
              // TODO: 検索
            },
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.dark
                    ? theme.colorScheme.surfaceContainerHighest
                    : const Color(0xFFEFEFEF),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.search_rounded,
                    size: 20,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    '検索',
                    style: AppTextStyles.bodySmall.copyWith(
                      color:
                          theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // スレッドリスト
        Expanded(
          child: threadsAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: Text('エラーが発生しました', style: AppTextStyles.body),
            ),
            data: (threads) {
              if (threads.isEmpty) {
                return const EmptyState(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'メッセージはありません',
                  description: 'メッセージがここに表示されます',
                );
              }

              return ListView.builder(
                padding: EdgeInsets.zero,
                itemCount: threads.length,
                itemBuilder: (context, index) {
                  final thread = threads[index];
                  return _ThreadTile(thread: thread);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

/// スレッドタイル — Teams チャットリストアイテムスタイル
class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread});

  final MessageThread thread;

  @override
  Widget build(BuildContext context) {
    final hasUnread = thread.unreadCount > 0;
    final displayName = thread.participantName ?? thread.title ?? '相手';
    final initial = displayName.isNotEmpty ? displayName[0] : '?';
    final theme = Theme.of(context);

    return InkWell(
      onTap: () {
        context.push(AppRoutes.messageThread, extra: thread);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: 12,
        ),
        child: Row(
          children: [
            // アバター（Teams: 40pt circle, 塗りアバター）
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.brandPrimary,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  initial,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            // コンテンツ
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: AppTextStyles.bodySmall.copyWith(
                            fontWeight:
                                hasUnread ? FontWeight.w600 : FontWeight.w400,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                      if (thread.latestMessage != null) ...[
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          _formatDate(thread.latestMessage!.createdAt),
                          style: AppTextStyles.caption.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.45),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (thread.latestMessage != null) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.latestMessage!.content,
                            style: AppTextStyles.caption.copyWith(
                              color: hasUnread
                                  ? theme.colorScheme.onSurface
                                  : theme.colorScheme.onSurface
                                      .withValues(alpha: 0.55),
                              fontWeight: hasUnread
                                  ? FontWeight.w500
                                  : FontWeight.w400,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (hasUnread) ...[
                          const SizedBox(width: AppSpacing.sm),
                          Container(
                            width: 20,
                            height: 20,
                            decoration: const BoxDecoration(
                              color: AppColors.brandPrimary,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '${thread.unreadCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    if (diff.inDays == 1) return '昨日';
    if (diff.inDays < 7) return '${diff.inDays}日前';
    return '${date.month}/${date.day}';
  }
}
