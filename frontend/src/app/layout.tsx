import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBSA 중복 지원 기업 검색 시스템",
  description: "경기도경제과학진흥원 중복 지원 기업 검색 및 이력 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased font-sans bg-[var(--color-gbsa-bg)] text-[var(--color-gbsa-text)]">
        {children}
      </body>
    </html>
  );
}
