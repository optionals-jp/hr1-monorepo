import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/utils/date_formatter.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/messages_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/message_threads_realtime_provider.dart';

/// メッセージ画面
class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // リアルタイム購読を開始（新規メッセージ受信時にスレッド一覧を自動更新）
    ref.watch(messageThreadsRealtimeProvider);

    final threadsAsync = ref.watch(messagesControllerProvider);
    final user = ref.watch(appUserProvider);

    return CommonScaffold(
      appBar: AppBar(
        titleSpacing: AppSpacing.screenHorizontal,
        title: Row(
          children: [
            OrgIcon(
              initial: (user?.organizationName ?? 'H').substring(0, 1),
              size: 32,
            ),
            const SizedBox(width: 10),
            Text(
              'チャット',
              style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
            ),
          ],
        ),
        centerTitle: false,
        actions: [
          GestureDetector(
            onTap: () => context.push(AppRoutes.profileFullscreen),
            child: Padding(
              padding: const EdgeInsets.only(
                right: AppSpacing.screenHorizontal,
              ),
              child: UserAvatar(
                initial: (user?.displayName ?? user?.email ?? 'U').substring(
                  0,
                  1,
                ),
                size: 32,
                imageUrl: user?.avatarUrl,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // 検索バー
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
              AppSpacing.screenHorizontal,
              AppSpacing.sm,
            ),
            child: const SearchBox(),
          ),

          // スレッドリスト
          Expanded(
            child: threadsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (error, _) => const ErrorState(),
              data: (threads) {
                if (threads.isEmpty) {
                  return EmptyState(
                    icon: AppIcons.directbox(
                      size: 64,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
                    ),
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
      ),
    );
  }
}

/// スレッドタイル
class _ThreadTile extends StatelessWidget {
  const _ThreadTile({required this.thread});

  final MessageThread thread;

  @override
  Widget build(BuildContext context) {
    final hasUnread = thread.unreadCount > 0;
    final displayName = thread.participantName ?? thread.title ?? '相手';
    final initial = displayName.isNotEmpty ? displayName[0] : '?';
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
                color: AppColors.brand,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  initial,
                  style: AppTextStyles.caption1.copyWith(
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
                spacing: 4,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          displayName,
                          style: AppTextStyles.body1.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      ),
                      if (thread.latestMessage != null) ...[
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          DateFormatter.toMessageDate(
                            thread.latestMessage!.createdAt,
                          ),
                          style: AppTextStyles.body2.copyWith(
                            color: AppColors.textTertiary(context),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (thread.latestMessage != null) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.latestMessage!.content,
                            style: AppTextStyles.body2.copyWith(
                              color: hasUnread
                                  ? AppColors.textPrimary(context)
                                  : AppColors.textSecondary(context),
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
                              color: AppColors.brand,
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                '${thread.unreadCount}',
                                style: AppTextStyles.body2.copyWith(
                                  color: Colors.white,
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
}
