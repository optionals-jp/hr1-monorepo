/**
 * Supabase Edge Function の名前定数。
 *
 * `client.functions.invoke(SUPABASE_FUNCTIONS.CREATE_USER, {...})` のように使用する。
 * 各アプリの Repository 層からのみ invoke されることを想定（hook / component から直接呼ばない）。
 *
 * Edge Function の実装場所: supabase/functions/<name>/
 */
export const SUPABASE_FUNCTIONS = {
  /**
   * ユーザー作成（profiles + organizations 関連付け + 任意で招待メール送信）。
   * auth スキーマへの直接 SQL は禁止のため、必ず本 Function 経由でユーザーを作成する。
   */
  CREATE_USER: "create-user",
} as const;

export type SupabaseFunctionName = (typeof SUPABASE_FUNCTIONS)[keyof typeof SUPABASE_FUNCTIONS];
