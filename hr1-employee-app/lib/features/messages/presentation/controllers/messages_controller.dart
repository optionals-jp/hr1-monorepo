import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/messages/domain/entities/message_thread.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

/// メッセージスレッド一覧コントローラー
class MessagesController extends AutoDisposeAsyncNotifier<List<MessageThread>> {
  @override
  Future<List<MessageThread>> build() async {
    final currentUser = ref.watch(appUserProvider);
    if (currentUser == null) return [];
    final repo = ref.watch(messagesRepositoryProvider);
    return repo.getThreads(currentUser.activeOrganizationId, currentUser.id);
  }

  /// スレッド一覧をリフレッシュ
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

final messagesControllerProvider =
    AutoDisposeAsyncNotifierProvider<MessagesController, List<MessageThread>>(
      MessagesController.new,
    );
