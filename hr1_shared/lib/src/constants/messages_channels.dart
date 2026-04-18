/// Realtime / Presence のチャンネル名・ペイロードキーを
/// hr1-applicant-app / hr1-employee-app / hr1-employee-web 間で統一する。
///
/// このファイルと [hr1-employee-web/src/lib/constants/messages-channels.ts]
/// の値は常に一致させること。
abstract class MessagesChannels {
  MessagesChannels._();

  /// postgres_changes を購読するチャンネル名
  static String messages(String threadId) => 'messages:$threadId';

  /// Presence（タイピング）購読チャンネル名
  static String typing(String threadId) => 'typing:$threadId';

  /// Presence payload のキー
  static const String payloadUserId = 'user_id';
  static const String payloadIsTyping = 'is_typing';
}
