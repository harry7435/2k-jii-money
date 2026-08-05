import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 로그인이 필요 없는 경로. 초대 링크(/join)는 미로그인 상태로도 열려야 한다. */
const PUBLIC_PATHS = ["/welcome", "/join"];

/** 로그인은 했지만 아직 가족이 없을 때 허용할 경로. */
const ONBOARDING_PATHS = ["/family-setup", "/create-family", "/join"];

function isPathIn(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * 로그인 후 돌아갈 경로를 안전하게 만든다.
 *
 * 같은 출처의 절대 경로만 허용한다. `//evil.com` 은 브라우저가 프로토콜 상대 URL로
 * 해석해 외부로 나가버리므로 `/`로 시작한다는 것만으로는 부족하다.
 */
export function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()는 토큰을 서버에서 검증한다. getSession()은 쿠키를 그대로 믿으므로
  // 인가 판단에 쓰면 안 된다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user) {
    if (isPathIn(pathname, PUBLIC_PATHS)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    url.search = "";
    // 초대 링크(/join)는 PUBLIC_PATHS라 여기 오지 않는다. 그 화면이 초대 맥락을
    // 보여준 뒤 next 파라미터를 붙여 로그인으로 보낸다.
    return NextResponse.redirect(url);
  }

  // 로그인 상태 — 가족 소속 여부로 갈린다.
  const { data: familyId } = await supabase.rpc("my_family_id");
  const hasFamily = Boolean(familyId);

  if (!hasFamily) {
    if (isPathIn(pathname, ONBOARDING_PATHS)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/family-setup";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 가족이 있는데 온보딩/로그인 화면에 있으면 홈으로 보낸다.
  // /join 은 예외 — "이미 가족에 속해 있다"는 안내를 그 화면에서 보여준다.
  if (
    pathname === "/" ||
    pathname === "/welcome" ||
    isPathIn(pathname, ["/family-setup", "/create-family"])
  ) {
    const next = safeNextPath(new URLSearchParams(search).get("next"));
    const url = request.nextUrl.clone();
    url.pathname = next ?? "/home/transactions";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 제외 대상:
     * - 정적 파일·이미지 최적화 — 요청마다 getUser()가 붙으면 불필요하게 느려진다
     * - /api/* — Vercel Cron 같은 세션 없는 호출이 /welcome으로 리다이렉트되면 안 된다.
     *   API 라우트는 각자 인가를 책임진다.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
