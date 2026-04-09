/**
 * recruit.hr1.jp / work.hr1.jp / client.hr1.jp 間で
 * 認証セッションを共有するため、cookieのdomainを `.hr1.jp` に設定する。
 * localhostではdomain指定なし（ブラウザのデフォルト動作）。
 */
export function getSharedCookieDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
    if (hostname.endsWith(".hr1.jp")) return ".hr1.jp";
  }
  // サーバーサイド: 環境変数で判定
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (siteUrl.includes(".hr1.jp")) return ".hr1.jp";
  return undefined;
}
