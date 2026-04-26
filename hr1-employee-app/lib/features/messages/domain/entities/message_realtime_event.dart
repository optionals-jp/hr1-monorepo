/// スレッド詳細画面で受信する Realtime / Presence イベント。
///
/// PostgresChangeFilter / Presence の差分を1つの sealed class に統合し、
/// Repository 層から Stream で配信する。
sealed class MessageRealtimeEvent {
  const MessageRealtimeEvent();
}

/// 新規メッセージ受信。`senderId` は markRead 判定で使用する。
class MessageInserted extends MessageRealtimeEvent {
  const MessageInserted({required this.messageId, required this.senderId});

  final String messageId;
  final String? senderId;
}

/// メッセージのソフトデリート。
class MessageSoftDeleted extends MessageRealtimeEvent {
  const MessageSoftDeleted({required this.messageId, required this.deletedAt});

  final String messageId;
  final DateTime deletedAt;
}

/// メッセージ本文の編集（リアクション・添付の変更は updated_at bump で発火）。
class MessageEdited extends MessageRealtimeEvent {
  const MessageEdited({
    required this.messageId,
    required this.content,
    required this.editedAt,
  });

  final String messageId;
  final String? content;
  final DateTime? editedAt;
}

/// 添付・リアクション等の派生情報を含めて再フェッチが必要な更新。
class MessageRefreshNeeded extends MessageRealtimeEvent {
  const MessageRefreshNeeded();
}

/// 相手側のタイピング状態変化。
class TypingStateChanged extends MessageRealtimeEvent {
  const TypingStateChanged({required this.otherUserTyping});

  final bool otherUserTyping;
}
