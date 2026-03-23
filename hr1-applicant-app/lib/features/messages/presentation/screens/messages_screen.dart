import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/core/utils/date_formatter.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/message_threads_realtime_provider.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/messages_providers.dart';

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
                    color: AppColors.textTertiary(Theme.of(context).brightness),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Text('メッセージはありません', style: AppTextStyles.callout),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    '気になることがあれば聞いてみましょう！',
                    style: AppTextStyles.body2.copyWith(
                      color: AppColors.lightTextSecondary,
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
                    : AppColors.lightTextSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            )
          : Text(
              'メッセージはありません',
              style: AppTextStyles.caption1.copyWith(
                color: AppColors.lightTextSecondary,
              ),
            ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (thread.latestMessage != null)
            Text(
              DateFormatter.toMessageDate(thread.latestMessage!.createdAt),
              style: AppTextStyles.caption2.copyWith(
                color: AppColors.lightTextSecondary,
              ),
            ),
          if (hasUnread) ...[
            const SizedBox(height: 4),
            CountBadge(
              count: thread.unreadCount,
              color: AppColors.brand,
              size: 20,
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
}
