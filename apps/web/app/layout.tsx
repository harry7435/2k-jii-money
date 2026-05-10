import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/src/lib/providers";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "우리집 가계부",
  description: "부부가 함께 관리하는 스마트 가계부",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/*
          Material Symbols는 ligature 기반 아이콘 폰트라 swap/optional을 쓰면
          폰트 로드 전에 "home", "shopping_cart" 같은 키워드 텍스트가 그대로 노출됨.
          block으로 invisible 처리해야 FOUT을 막을 수 있어 Next의 권장값을 의도적으로 어김.
          no-page-custom-font 룰은 Pages Router용이며, App Router의 루트 layout은
          _document.js와 동등한 위치이므로 무시해도 안전함.
        */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className={`${geist.variable} font-sans antialiased bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
