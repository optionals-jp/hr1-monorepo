import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

/**
 * functions.invoke のエラーが 401（Invalid JWT）かどうかを判定する。
 * FunctionsHttpError の context は fetch の Response オブジェクト。
 */
function isFunctions401(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name !== "FunctionsHttpError") return false;
  const status = (error as Error & { context?: { status?: number } }).context?.status;
  return status === 401;
}

/**
 * functions.invoke の error を受け取り、401 の場合は /login へリダイレクトした上で
 * 常に例外を再スローする。全 functions.invoke 呼び出しでこれを使う。
 */
export function assertNotUnauthorized(error: unknown): never {
  if (isFunctions401(error)) {
    getSupabase()
      .auth.signOut()
      .finally(() => {
        window.location.replace("/login");
      });
  }
  throw error as Error;
}
