import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/messages/data/repositories/supabase_messages_repository.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';

/// MessagesRepository プロバイダー
final messagesRepositoryProvider = Provider<SupabaseMessagesRepository>((ref) {
  return SupabaseMessagesRepository(Supabase.instance.client);
});

/// スレッド一覧（社員の所属組織）
final messageThreadsProvider = FutureProvider.autoDispose<List<MessageThread>>((
  ref,
) async {
  final currentUser = ref.watch(appUserProvider);
  if (currentUser == null) return [];
  final repo = ref.watch(messagesRepositoryProvider);
  return repo.getThreads(currentUser.activeOrganizationId, currentUser.id);
});

/// スレッドIDからメッセージ一覧を取得
final threadMessagesProvider = FutureProvider.autoDispose
    .family<List<Message>, String>((ref, threadId) async {
      final repo = ref.watch(messagesRepositoryProvider);
      return repo.getMessages(threadId);
    });
