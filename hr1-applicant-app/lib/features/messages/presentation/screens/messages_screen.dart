import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/error_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/user_avatar.dart';
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
      loading: () => const LoadingIndicator(),
      error: (error, _) =>
          ErrorState(onRetry: () => ref.invalidate(messageThreadsProvider)),
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
      leading: UserAvatar(
        initial: initial,
        color: AppColors.primaryLight,
        size: 44,
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              displayName,
              style: AppTextStyles.body2.copyWith(
                fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (thread.latestMessage != null)
            Text(
              DateFormatter.toRelative(thread.latestMessage!.createdAt),
              style: AppTextStyles.caption2.copyWith(
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
              style: AppTextStyles.caption2.copyWith(
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
                    style: AppTextStyles.caption1.copyWith(
                      color: hasUnread
                          ? AppColors.textPrimary
                          : AppColors.textSecondary,
                      fontWeight: hasUnread ? FontWeight.w500 : FontWeight.w400,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (hasUnread) ...[
                  const SizedBox(width: AppSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${thread.unreadCount}',
                      style: AppTextStyles.caption2.copyWith(
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
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: 4,
      ),
      onTap: () {
        context.push('/messages/${thread.id}', extra: thread);
      },
    );
  }
}
