import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase-server";
import { getCachedRole, setCachedRole, clearCachedRole } from "@hr1/shared-ui/lib/role-cache";

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ（完全一致）
  if (PUBLIC_PATHS.has(pathname)) {
    const { response } = createSupabaseMiddlewareClient(request);
    return response;
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // セッション検証
  // 非本番: getSession()（ローカルJWT検証のみ、API呼び出しなし）
  // 本番: getUser()（サーバーサイド検証、失効セッション検知あり）
  const user =
    process.env.NODE_ENV !== "production"
      ? ((await supabase.auth.getSession()).data.session?.user ?? null)
      : ((await supabase.auth.getUser()).data.user ?? null);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ロールチェック（HMAC署名付きcookieキャッシュ）
  let role = await getCachedRole(request, user.id);
  let roleFreshlyFetched = false;

  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    roleFreshlyFetched = true;
  }

  if (!role || role !== "hr1_admin") {
    await supabase.auth.signOut();
    clearCachedRole(response);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
  }

  if (roleFreshlyFetched) {
    await setCachedRole(response, user.id, role);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * _next/static, _next/image, favicon.ico, 静的ファイルを除外
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
