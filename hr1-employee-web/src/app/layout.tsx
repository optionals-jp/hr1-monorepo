import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "./client-layout";
import { type Product, PRODUCT_COOKIE, isValidProduct } from "@/lib/product";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HR1 Employee",
  description: "HR1 社員ポータル",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const productCookie = cookieStore.get(PRODUCT_COOKIE)?.value ?? "";
  const product: Product = isValidProduct(productCookie) ? productCookie : "working";

  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} antialiased`}>
        <ClientLayout product={product}>{children}</ClientLayout>
      </body>
    </html>
  );
}
