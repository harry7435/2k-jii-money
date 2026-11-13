import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리집 가계부",
    short_name: "우리집 가계부",
    description: "부부가 함께 관리하는 스마트 가계부",
    // /home은 /home/transactions로 리다이렉트한다. 시작 주소로 두면 PWA를 열 때마다
    // 문서 왕복과 proxy의 getUser() 호출이 한 번씩 더 든다.
    start_url: "/home/transactions",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android가 원·물방울 등으로 잘라내므로 여백이 넉넉한 꽉 찬 사각형을 따로 둔다
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
