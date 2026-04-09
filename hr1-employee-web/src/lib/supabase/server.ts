import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSharedCookieDomain } from "./cookie-options";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const domain = getSharedCookieDomain();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, { ...options, domain });
            }
          } catch {
            // Server Component からの呼び出し時は set が失敗するが問題ない
          }
        },
      },
    }
  );
}
