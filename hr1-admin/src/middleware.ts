import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase-server";

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ（完全一致）
  if (PUBLIC_PATHS.has(pathname)) {
    const { response } = createSupabaseMiddlewareClient(request);
    return response;
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // セッション検証（トークンリフレッシュも行われる）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // サーバーサイドでロールチェック（hr1_admin のみ許可）
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "hr1_admin") {
    // 不正なロール → サインアウトしてログインへリダイレクト
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    const redirectResponse = NextResponse.redirect(loginUrl);
    // signOut で設定された Cookie を redirect レスポンスにコピー
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    return redirectResponse;
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
