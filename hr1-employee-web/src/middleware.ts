import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { type Product, PRODUCT_COOKIE, detectProductFromHost, isValidProduct } from "@/lib/product";

const PUBLIC_PATHS = new Set(["/login"]);

const ALLOWED_ROUTES: Record<Product, string[]> = {
  recruiting: [
    "/",
    "/dashboard",
    "/my-attendance",
    "/my-leave",
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const product = detectProduct(request);

  if (PUBLIC_PATHS.has(pathname)) {
    const { response } = createSupabaseMiddlewareClient(request);
    setProductCookie(request, response, product);
    return response;
  }

  // --- ルート制限 ---
  if (!isRouteAllowed(product, pathname)) {
    const dashboardUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    setProductCookie(request, redirectResponse, product);
    return redirectResponse;
  }

  // --- 認証 ---
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    setProductCookie(request, redirectResponse, product);
    return redirectResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "employee" && profile.role !== "admin")) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    }
    setProductCookie(request, redirectResponse, product);
    return redirectResponse;
  }

  setProductCookie(request, response, product);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
