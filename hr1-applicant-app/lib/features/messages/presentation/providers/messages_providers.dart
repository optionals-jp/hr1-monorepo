import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_messages_repository.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';

/// MessagesRepository プロバイダー
final messagesRepositoryProvider = Provider<MessagesRepository>((ref) {
  return SupabaseMessagesRepository(ref.watch(supabaseClientProvider));
});

/// スレッド一覧
final messageThreadsProvider = FutureProvider.autoDispose<List<MessageThread>>((
  ref,
) async {
  final currentUser = ref.watch(appUserProvider);
  if (currentUser == null) return [];
  final repo = ref.watch(messagesRepositoryProvider);
  return repo.getThreads(currentUser.id);
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
