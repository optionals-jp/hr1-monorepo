import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/message_thread.dart';
import '../providers/messages_providers.dart';

/// メッセージスレッド一覧コントローラー
class MessagesController
    extends AutoDisposeAsyncNotifier<List<MessageThread>> {
  @override
  Future<List<MessageThread>> build() async {
    final currentUser = ref.watch(appUserProvider);
    if (currentUser == null) return [];
    final repo = ref.watch(messagesRepositoryProvider);
    return repo.getThreads(currentUser.organizationId, currentUser.id);
  }

  /// スレッド一覧をリフレッシュ
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

final messagesControllerProvider = AutoDisposeAsyncNotifierProvider<
    MessagesController, List<MessageThread>>(
  MessagesController.new,
);
