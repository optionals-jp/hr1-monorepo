/**
 * メンションのトークン表現ユーティリティ
 *
 * 本文内に `@[表示名](user-uuid)` 形式で埋め込み、表示時は `@表示名`、
 * 送信時は UUID 配列を抽出する。Web / Flutter 双方で同一形式を扱う。
 */

export interface MentionSegment {
  text: string;
  userId?: string;
}

const MENTION_PATTERN = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function parseMentionTokens(raw: string): MentionSegment[] {
  const result: MentionSegment[] = [];
  let cursor = 0;
  // Reset regex state
  MENTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_PATTERN.exec(raw)) !== null) {
    if (match.index > cursor) {
      result.push({ text: raw.substring(cursor, match.index) });
    }
    result.push({ text: `@${match[1]}`, userId: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < raw.length) {
    result.push({ text: raw.substring(cursor) });
  }
  return result;
}

export function extractMentionedUserIds(raw: string): string[] {
  const ids = new Set<string>();
  MENTION_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_PATTERN.exec(raw)) !== null) {
    ids.add(match[2]);
  }
  return Array.from(ids);
}

export function stripMentionTokens(raw: string): string {
  return raw.replace(MENTION_PATTERN, (_, name: string) => `@${name}`);
}

export function buildMentionToken(displayName: string, userId: string): string {
  return `@[${displayName}](${userId})`;
}
