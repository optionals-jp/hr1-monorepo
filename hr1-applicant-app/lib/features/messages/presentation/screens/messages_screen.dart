import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/error_state.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../shared/widgets/org_icon.dart';
import '../../domain/entities/message_thread.dart';
import '../providers/message_threads_realtime_provider.dart';
import '../providers/messages_providers.dart';

/// メッセージ画面 — 企業とのスレッド一覧
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // リアルタイム購読を開始（新規メッセージ受信時にスレッド一覧を自動更新）
    ref.watch(messageThreadsRealtimeProvider);

    final threadsAsync = ref.watch(messageThreadsProvider);

    return threadsAsync.when(
      loading: () => const LoadingIndicator(),
      error: (e, _) =>
          ErrorState(onRetry: () => ref.invalidate(messageThreadsProvider)),
      data: (threads) {
        if (threads.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xxl),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.chat_bubble_outline_rounded,
                    size: 48,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.2),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text('メッセージはありません', style: AppTextStyles.callout),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    '気になることがあれば聞いてみましょう！',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(messageThreadsProvider),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            itemCount: threads.length,
            separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
            itemBuilder: (context, index) =>
                _ThreadTile(thread: threads[index]),
          ),
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
      leading: OrgIcon(initial: initial, size: 44, borderRadius: 10),
      title: Text(
        displayName,
        style: AppTextStyles.body2.copyWith(
          fontWeight: hasUnread ? FontWeight.w600 : FontWeight.w400,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: thread.latestMessage != null
          ? Text(
              thread.latestMessage!.content,
              style: AppTextStyles.caption1.copyWith(
                color: hasUnread
                    ? Theme.of(context).colorScheme.onSurface
                    : AppColors.textSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            )
          : Text(
              'メッセージはありません',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (thread.latestMessage != null)
            Text(
              _formatDate(thread.latestMessage!.createdAt),
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          if (hasUnread) ...[
            const SizedBox(height: 4),
            Container(
              width: 20,
              height: 20,
              decoration: const BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${thread.unreadCount}',
                  style: AppTextStyles.caption2.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
      onTap: () => context.push(
        AppRoutes.messageThread.replaceFirst(':threadId', thread.id),
        extra: thread,
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final local = dt.toLocal();
    if (local.year == now.year &&
        local.month == now.month &&
        local.day == now.day) {
      return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    }
    if (local.year == now.year) {
      return '${local.month}/${local.day}';
    }
    return '${local.year}/${local.month}/${local.day}';
  }
}
