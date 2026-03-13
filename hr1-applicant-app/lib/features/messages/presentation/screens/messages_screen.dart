import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../domain/entities/message_thread.dart';
import '../providers/messages_providers.dart';

/// メッセージ画面
/// 応募先企業とのメッセージ一覧
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final threadsAsync = ref.watch(messageThreadsProvider);

    return threadsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Text('エラーが発生しました', style: AppTextStyles.body),
      ),
      data: (threads) {
        if (threads.isEmpty) {
          return const EmptyState(
            icon: Icons.chat_bubble_outline,
            title: 'メッセージはありません',
            description: '応募先企業からの連絡がここに表示されます',
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
          itemCount: threads.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
          itemBuilder: (context, index) {
            final thread = threads[index];
            return _ThreadTile(thread: thread);
          },
        );
      },
    );
  }
}

class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread});

  final MessageThread thread;

  @override
  Widget build(BuildContext context) {
    final hasUnread = thread.unreadCount > 0;
    final displayName = thread.organizationName ?? '企業';
    final initial = displayName.isNotEmpty ? displayName[0] : '?';

    return ListTile(
      leading: CircleAvatar(
        radius: 22,
        backgroundColor: AppColors.primaryLight.withValues(alpha: 0.1),
        child: Text(
          initial,
          style: AppTextStyles.subtitle.copyWith(
            color: AppColors.primaryLight,
          ),
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              displayName,
              style: AppTextStyles.body.copyWith(
                fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (thread.latestMessage != null)
            Text(
              _formatDate(thread.latestMessage!.createdAt),
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (thread.jobTitle != null)
            Text(
              thread.jobTitle!,
              style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          if (thread.latestMessage != null) ...[
            const SizedBox(height: 2),
            Row(
              children: [
                Expanded(
                  child: Text(
                    thread.latestMessage!.content,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: hasUnread
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                      fontWeight:
                          hasUnread ? FontWeight.w500 : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (hasUnread) ...[
                  const SizedBox(width: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${thread.unreadCount}',
                      style: AppTextStyles.caption.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ],
      ),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 4),
      onTap: () {
        context.push('/messages/${thread.id}', extra: thread);
      },
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
