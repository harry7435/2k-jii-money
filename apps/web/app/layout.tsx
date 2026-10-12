import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "@/src/lib/providers";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

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

          축 범위(opsz,wght,FILL,GRAD)를 지정하지 않는다. 지정하면 전체 가변 폰트(약 4MB)가
          내려오고, display=block이라 그동안 아이콘이 전부 비어 보인다. 이 앱은
          font-variation-settings를 쓰지 않으므로 기본 인스턴스(약 320KB)면 충분하다.
        */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=block"
        />
      </head>
      <body className={`${geist.variable} font-sans antialiased bg-gray-50`}>
        <Providers>{children}</Providers>
        <Analytics />
        {CLARITY_PROJECT_ID && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
