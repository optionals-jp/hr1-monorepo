export type Product = "recruiting" | "working" | "client";

export const PRODUCT_COOKIE = "hr1-product";

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

export function detectProductFromHost(host: string): Product {
  const hostname = host.split(":")[0];
  return HOST_PRODUCT_MAP[hostname] ?? "working";
}

export function isValidProduct(value: string): value is Product {
  return value === "recruiting" || value === "working" || value === "client";
}

export function getProductUrl(product: Product): string {
  if (typeof window === "undefined") return "/";
  const hostname = window.location.hostname;

  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocal) {
    return `/dashboard?product=${product}`;
  }

  return `https://${PRODUCT_HOSTS[product]}/dashboard`;
}
