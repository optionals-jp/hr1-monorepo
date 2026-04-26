import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/messages_controller.dart';
import 'package:hr1_employee_app/features/messages/presentation/providers/messages_providers.dart';

/// メッセージテーブルの変更を購読し、スレッド一覧を自動更新するプロバイダー。
///
/// MessagesScreen の build 内で `ref.watch` することで購読を開始する。
/// 画面が破棄されるとリポジトリの Stream が onCancel され、
/// 内部で channel が解放される。
final messageThreadsRealtimeProvider = StreamProvider.autoDispose<void>((ref) {
  final repo = ref.watch(messagesRepositoryProvider);
  return repo.watchAllThreadMessages().map((_) {
    ref.invalidate(messagesControllerProvider);
  });
});
