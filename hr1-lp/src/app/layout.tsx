import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR1 - 人事のすべてを、ひとつに。| 統合人事管理プラットフォーム",
  description:
    "HR1は採用・勤怠・評価・給与をひとつに統合する次世代人事管理プラットフォーム。業務効率化と組織の成長を実現します。無料デモ実施中。",
  keywords: [
    "人事管理",
    "HR",
    "採用管理",
    "勤怠管理",
    "人事評価",
    "給与管理",
    "HRテック",
    "人事システム",
    "クラウド人事",
  ],
  openGraph: {
    title: "HR1 - 人事のすべてを、ひとつに。",
    description:
      "採用・勤怠・評価・給与をひとつに統合する次世代人事管理プラットフォーム。無料デモ実施中。",
    type: "website",
    locale: "ja_JP",
    siteName: "HR1 Studio",
  },
  twitter: {
    card: "summary_large_image",
    title: "HR1 - 人事のすべてを、ひとつに。",
    description: "次世代の統合人事管理プラットフォーム。無料デモ実施中。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
