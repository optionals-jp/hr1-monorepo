import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../data/repositories/supabase_messages_repository.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';

/// MessagesRepository プロバイダー
final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  return SupabaseMessagesRepository(ref.watch(supabaseClientProvider));
});

/// スレッド一覧（現在選択中の企業でフィルタ、スレッド未作成なら自動作成）
final messageThreadsProvider = FutureProvider.autoDispose<List<MessageThread>>((
  ref,
) async {
  final currentUser = ref.watch(appUserProvider);
  if (currentUser == null) return [];
  final currentOrg = ref.watch(currentOrganizationProvider);
  if (currentOrg == null) return [];
  final repo = ref.watch(messagesRepositoryProvider);
  final threads = await repo.getThreads(
    currentUser.id,
    organizationId: currentOrg.id,
  );
  if (threads.isNotEmpty) return threads;

  // スレッドが無い場合は自動作成して返す
  final newThread = await repo.getOrCreateThread(
    userId: currentUser.id,
    organizationId: currentOrg.id,
  );
  return [newThread];
});

/// 応募者と企業の1対1スレッドを取得または作成
final applicantThreadProvider = FutureProvider.autoDispose
    .family<MessageThread, ({String userId, String organizationId})>((
      ref,
      params,
    ) async {
      final repo = ref.watch(messagesRepositoryProvider);
      return repo.getOrCreateThread(
        userId: params.userId,
        organizationId: params.organizationId,
      );
    });

/// スレッドIDからメッセージ一覧を取得
final threadMessagesProvider = FutureProvider.autoDispose
    .family<List<Message>, String>((ref, threadId) async {
      final repo = ref.watch(messagesRepositoryProvider);
      return repo.getMessages(threadId);
    });
