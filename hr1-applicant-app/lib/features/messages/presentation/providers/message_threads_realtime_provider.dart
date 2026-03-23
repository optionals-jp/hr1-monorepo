import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/messages/presentation/providers/messages_providers.dart';

/// メッセージテーブルの変更を購読し、スレッド一覧を自動更新するプロバイダー
///
/// INSERT（新規メッセージ）、UPDATE（既読状態変更）、DELETE を監視。
/// MessagesScreen の build 内で `ref.watch` することで購読を開始する。
/// 画面が破棄されると自動的にチャネルを解除する。
final messageThreadsRealtimeProvider = AutoDisposeProvider<void>((ref) {
  final client = Supabase.instance.client;
  final channel = client
      .channel('message_threads_realtime')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'messages',
        callback: (_) {
          ref.invalidate(messageThreadsProvider);
        },
      )
      .subscribe();

  ref.onDispose(() {
    client.removeChannel(channel);
  });
});
