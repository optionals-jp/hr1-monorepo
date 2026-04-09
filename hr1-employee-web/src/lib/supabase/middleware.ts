import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") ?? "";
  if (host.includes(".hr1.jp")) return ".hr1.jp";
  return undefined;
}

export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });
  const domain = getCookieDomain(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, { ...options, domain });
          }
        },
      },
    }
  );

  return { supabase, response };
}
