import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_messages_repository.dart';
import '../../domain/entities/message_thread.dart';
import '../../domain/repositories/messages_repository.dart';

/// MessagesRepository プロバイダー
final messagesRepositoryProvider =
    Provider<MessagesRepository>((ref) {
  return SupabaseMessagesRepository(ref.watch(supabaseClientProvider));
});

/// スレッド一覧
final messageThreadsProvider =
    FutureProvider.autoDispose<List<MessageThread>>((ref) async {
  final currentUser = ref.watch(appUserProvider);
  if (currentUser == null) return [];
  final repo = ref.watch(messagesRepositoryProvider);
  return repo.getThreads(currentUser.id);
});

/// スレッドIDからメッセージ一覧を取得
final threadMessagesProvider =
    FutureProvider.autoDispose.family<List<Message>, String>((ref, threadId) async {
  final repo = ref.watch(messagesRepositoryProvider);
  return repo.getMessages(threadId);
});
