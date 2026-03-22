import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/messages/presentation/controllers/messages_controller.dart';

/// メッセージテーブルの INSERT イベントを購読し、スレッド一覧を自動更新するプロバイダー
///
/// MessagesScreen の build 内で `ref.watch` することで購読を開始する。
/// 画面が破棄されると自動的にチャネルを解除する。
final messageThreadsRealtimeProvider = AutoDisposeProvider<void>((ref) {
  final client = Supabase.instance.client;
  final channel = client
      .channel('message_threads_realtime')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'messages',
        callback: (_) {
          ref.invalidate(messagesControllerProvider);
        },
      )
      .subscribe();

  ref.onDispose(() {
    client.removeChannel(channel);
  });
});
