/**
 * Supabase RPC (PostgreSQL) 例外を UI 向けメッセージに変換する。
 *
 * - P0001 (user-defined) は RPC が `RAISE EXCEPTION '...日本語...'` したもの → message をそのまま使う
 * - 42501 / 23503 / 23514 / 23505 等のシステムコードは UI に英語を漏らさず定型メッセージへ
 * - それ以外は message があればそのまま、無ければ fallback
 */
export function mapRpcError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : null;
  const message = typeof e.message === "string" ? e.message : null;

  if (code === "42501") return "この操作を行う権限がありません";
  if (code === "23503") return "関連データが存在するため操作できません";
  if (code === "23505") return "同一の項目が既に登録されています";
  if (code === "23514") return "入力内容が制約条件を満たしていません";

  // P0001 は RPC 側で日本語固定しているので message をそのまま使う
  if (code === "P0001" && message) return message;

  // 上記以外 (code 不明) : message があれば使うが、英語らしき文言 (permission denied 等) を遮断
  if (message && !/permission denied|violates |duplicate key|null value/i.test(message)) {
    return message;
  }
  return fallback;
}
