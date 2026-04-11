/**
 * PostgreSQL / PostgREST の標準エラーコード定数。
 *
 * 典型的なユースケース:
 *   try {
 *     await client.from("...").insert(...);
 *   } catch (e) {
 *     const code = (e as { code?: string })?.code;
 *     if (code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
 *       // 一意制約違反は想定内の競合として処理
 *     } else {
 *       throw e;
 *     }
 *   }
 *
 * 参照: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_ERROR_CODES = {
  /** 23505: UNIQUE 制約違反（重複 INSERT） */
  UNIQUE_VIOLATION: "23505",
  /** 23503: 外部キー制約違反 */
  FOREIGN_KEY_VIOLATION: "23503",
  /** 23502: NOT NULL 制約違反 */
  NOT_NULL_VIOLATION: "23502",
  /** 23514: CHECK 制約違反 */
  CHECK_VIOLATION: "23514",
  /** 42501: 権限不足（RLS ポリシー拒否を含む） */
  INSUFFICIENT_PRIVILEGE: "42501",
} as const;

export type PgErrorCode = (typeof PG_ERROR_CODES)[keyof typeof PG_ERROR_CODES];

/**
 * Supabase / PostgREST エラーから Postgres エラーコードを安全に取り出す。
 */
export function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
