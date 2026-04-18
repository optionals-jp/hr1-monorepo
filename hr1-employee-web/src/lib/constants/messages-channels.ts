/**
 * Realtime / Presence のチャンネル名・ペイロードキーを
 * hr1-applicant-app / hr1-employee-app / hr1-employee-web 間で統一する。
 *
 * このファイルと [hr1_shared/lib/src/constants/messages_channels.dart]
 * の値は常に一致させること。
 */
export const MessagesChannels = {
  /** postgres_changes を購読するチャンネル名 */
  messages: (threadId: string) => `messages:${threadId}`,
  /** Presence（タイピング）購読チャンネル名 */
  typing: (threadId: string) => `typing:${threadId}`,
  /** Presence payload のキー */
  payloadUserId: "user_id",
  payloadIsTyping: "is_typing",
} as const;
