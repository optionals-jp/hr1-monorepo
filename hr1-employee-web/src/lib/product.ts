export type Product = "recruiting" | "working" | "client";

const HOST_PRODUCT_MAP: Record<string, Product> = {
  "recruit.hr1.jp": "recruiting",
  "work.hr1.jp": "working",
  "client.hr1.jp": "client",
};

export const PRODUCT_LABELS: Record<Product, string> = {
  recruiting: "HR1 Recruiting",
  working: "HR1 Working",
  client: "HR1 Client",
};

const PRODUCT_HOSTS: Record<Product, string> = {
  recruiting: "recruit.hr1.jp",
  working: "work.hr1.jp",
  client: "client.hr1.jp",
};

export function getProductUrl(product: Product): string {
  if (typeof window === "undefined") return "/";
  const hostname = window.location.hostname;

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal) {
    return `/dashboard?product=${product}`;
  }

  return `https://${PRODUCT_HOSTS[product]}/dashboard`;
}

export function detectProduct(hostname: string, searchParams?: string): Product {
  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    const param = params.get("product");
    if (param === "recruiting" || param === "working" || param === "client") return param;
  }

  const mapped = HOST_PRODUCT_MAP[hostname];
  if (mapped) return mapped;

  return "working";
}
