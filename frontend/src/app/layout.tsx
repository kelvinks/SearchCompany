import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource/gowun-dodum";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource/nanum-gothic/400.css";
import "@fontsource/nanum-gothic/700.css";
import "@fontsource-variable/chiron-goround-tc";
import "@fontsource/gothic-a1/400.css";
import "@fontsource/nanum-gothic-coding/400.css";
import "@fontsource/dongle/300.css";
import "@fontsource-variable/asta-sans";
import "@fontsource/iosevka-charon/400.css";
import "@fontsource/iosevka-charon/700.css";
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
      <body suppressHydrationWarning className="antialiased bg-[var(--color-gbsa-bg)] text-[var(--color-gbsa-text)]">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
