import 'package:hr1_employee_app/features/messages/domain/entities/message_realtime_event.dart';

/// スレッド詳細画面の Realtime / Presence セッション。
///
/// Repository が channel の lifecycle を所有する。Controller は [events] を
/// listen し、入力時に [updateTyping] を呼ぶだけでよい。破棄は [dispose] で。
abstract class MessageThreadRealtime {
  Stream<MessageRealtimeEvent> get events;

  /// 自身のタイピング状態を Presence に通知する。
  Future<void> updateTyping({required bool isTyping});

  /// チャネル購読を解除する。
  Future<void> dispose();
}
