import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { type Product, PRODUCT_COOKIE, detectProductFromHost, isValidProduct } from "@/lib/product";
import { getCachedRole, setCachedRole, clearCachedRole } from "@hr1/shared-ui/lib/role-cache";

const PUBLIC_PATHS = new Set(["/login"]);

const ALLOWED_ROUTES: Record<Product, string[]> = {
  recruiting: [
    "/",
    "/dashboard",
    "/applicants",
    "/applications",
    "/jobs",
    "/scheduling",
    "/forms",
    "/evaluations",
    "/messages",
    "/calendar",
    "/tasks",
    "/announcements",
    "/faqs",
    "/notifications",
    "/profile",
  ],
  working: [
    "/",
    "/dashboard",
    "/my-attendance",
    "/my-leave",
    "/payslips",
    "/shifts",
    "/workflows",
    "/service-requests",
    "/projects",
    "/employees",
    "/wiki",
    "/surveys",
    "/evaluations",
    "/compliance",
    "/messages",
    "/calendar",
    "/tasks",
    "/announcements",
    "/faqs",
    "/notifications",
    "/profile",
  ],
  client: [
    "/",
    "/dashboard",
    "/crm",
    "/messages",
    "/calendar",
    "/tasks",
    "/announcements",
    "/faqs",
    "/notifications",
    "/profile",
  ],
};

function isRouteAllowed(product: Product, pathname: string): boolean {
  const allowed = ALLOWED_ROUTES[product];
  return allowed.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(route + "/")
  );
}

function detectProduct(request: NextRequest): Product {
  const host = request.headers.get("host") ?? "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (isLocal) {
    const queryProduct = request.nextUrl.searchParams.get("product");
    if (queryProduct && isValidProduct(queryProduct)) return queryProduct;
    const cookieProduct = request.cookies.get(PRODUCT_COOKIE)?.value;
    if (cookieProduct && isValidProduct(cookieProduct)) return cookieProduct;
  }

  return detectProductFromHost(host);
}

function getProductCookieDomain(request: NextRequest): string | undefined {
  const host = request.headers.get("host") ?? "";
  if (host.includes(".hr1.jp")) return ".hr1.jp";
  return undefined;
}

function setProductCookie(request: NextRequest, response: NextResponse, product: Product) {
  const domain = getProductCookieDomain(request);
  request.cookies.set(PRODUCT_COOKIE, product);
  response.cookies.set(PRODUCT_COOKIE, product, { path: "/", sameSite: "lax", domain });
}

function applySecurityHeaders(response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : " 'unsafe-inline'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${supabaseUrl} wss://*.supabase.co${isDev ? " ws://localhost:*" : ""}`,
    "frame-ancestors 'none'",
  ];

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const product = detectProduct(request);

  if (PUBLIC_PATHS.has(pathname)) {
    const { response } = createSupabaseMiddlewareClient(request);
    setProductCookie(request, response, product);
    applySecurityHeaders(response);
    return response;
  }

  // --- ルート制限 ---
  if (!isRouteAllowed(product, pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    setProductCookie(request, redirectResponse, product);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  // --- 認証 ---
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
    const redirectResponse = NextResponse.redirect(loginUrl);
    setProductCookie(request, redirectResponse, product);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
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

  const allowedRoles = ["employee", "admin", "manager", "approver"];
  if (!role || !allowedRoles.includes(role)) {
    await supabase.auth.signOut();
    clearCachedRole(response);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    setProductCookie(request, redirectResponse, product);
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }

  if (roleFreshlyFetched) {
    await setCachedRole(response, user.id, role);
  }
  setProductCookie(request, response, product);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
