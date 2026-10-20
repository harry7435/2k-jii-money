"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Ssgoi } from "@ssgoi/react";
import { SsgoiRouteBoundary } from "@ssgoi/react/nextjs";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import { createClient } from "@/src/lib/supabase/client";
import { getCurrentMembership } from "@/src/lib/supabase/queries";
import { TABS } from "@/src/lib/constants/navigation";
import { useSsgoiConfig } from "@/src/lib/ssgoiConfig";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const qc = useQueryClient();
  const ssgoiConfig = useSsgoiConfig();
  const setFamily = useFamilyStore((s) => s.setFamily);
  const setMember = useFamilyStore((s) => s.setMember);

  // 진실의 원천은 서버다. 미로그인·무소속 상태는 proxy.ts가 이미 걸러내므로
  // 여기서는 리다이렉트하지 않고 store를 채우기만 한다.
  // staleTime: Infinity를 쓰지 않는다. 세션에 의존하는 값이라, 한 번 null이
  // 캐시되면 로그인해도 영구히 null로 남고 전체 새로고침 전에는 복구되지 않는다.
  const {
    data: membership,
    isPending,
    error,
  } = useQuery({
    queryKey: ["membership"],
    queryFn: getCurrentMembership,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (membership) {
      setFamily(membership.family);
      setMember(membership.member);
    }
  }, [membership, setFamily, setMember]);

  // 토큰 갱신·로그인·로그아웃이 일어나면 소속 정보를 다시 읽는다.
  // 이게 없으면 세션이 바뀌어도 이전 세션 기준의 캐시를 계속 쓴다.
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        qc.invalidateQueries({ queryKey: ["membership"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  // 아래 두 분기는 "아무것도 안 뜨는 화면"을 막기 위한 것이다.
  // 예전에는 조회가 실패해도 null을 반환해 원인 없이 검은 화면만 남았다.
  if (error) {
    return (
      <StatusScreen
        title="가계부를 불러오지 못했습니다"
        detail={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  // isPending 중에는 membership이 undefined다. 그걸 "가족 없음"으로 읽으면
  // 로딩 중에 온보딩 안내가 번쩍이므로 판정을 조회가 끝난 뒤로 미룬다.
  if (!isPending && !membership) {
    return (
      <StatusScreen
        title="아직 가족에 속해 있지 않습니다"
        detail="가계부를 만들거나 초대 링크로 참여해 주세요."
        action={{ href: "/family-setup", label: "가족 설정으로 이동" }}
      />
    );
  }

  // membership을 기다리는 동안 전체를 텍스트 화면으로 막지 않는다. 탭바까지 사라지면
  // 실제 소요와 무관하게 훨씬 느리게 느껴진다. 로딩 표시는 각 페이지의 스켈레톤이 맡고,
  // 페이지들은 familyId가 빌 동안을 로딩으로 취급한다.
  return (
    <div className="flex flex-col md:flex-row min-h-screen max-w-md md:max-w-none mx-auto bg-white">
      {/* Sidebar navigation (desktop) / Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex z-40 md:static md:w-56 md:max-w-none md:flex-col md:border-t-0 md:border-r md:py-6 md:gap-1 md:shrink-0">
        <div className="hidden md:block px-4 pb-4 mb-4 border-b border-gray-100">
          <p className="font-bold text-lg text-teal-500">우리집 가계부</p>
        </div>
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 md:flex-none md:flex-row md:justify-start md:px-4 md:py-3 md:gap-3 md:rounded-lg md:mx-2 ${
                active ? "md:bg-teal-50" : "md:hover:bg-gray-50"
              }`}
            >
              <span
                className={`material-symbols-outlined text-2xl ${
                  active ? "text-teal-400" : "text-gray-500"
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] md:text-sm ${active ? "text-teal-400 font-semibold" : "text-gray-500"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ssgoi는 나가는 페이지를 이 셸 기준 absolute로 잠시 붙인다. 탭바는 셸 밖이라 움직이지 않는다.
          overflow-y를 두지 않는다: ssgoi가 이 div를 스크롤 요소로 오인해 탭 전환 시 스크롤이 튄다.
          경계는 불투명 배경 + 화면 높이를 가진다: drill은 새 화면이 이전 화면 위를 덮으며 들어오므로
          투명하거나 짧으면 아래 화면이 비친다. 높이는 하단 탭바 여백(pb-20)만큼 빼 짧은 페이지에 스크롤이 생기지 않게 한다. */}
      <div className="flex-1 relative z-0 overflow-x-clip pb-20 md:pb-0">
        <Ssgoi config={ssgoiConfig}>
          <SsgoiRouteBoundary className="bg-white min-h-[calc(100dvh-5rem)] md:min-h-dvh">
            {children}
          </SsgoiRouteBoundary>
        </Ssgoi>
      </div>
    </div>
  );
}

function StatusScreen({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white text-center">
      <div className="w-full max-w-sm space-y-3">
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600 wrap-break-word">{detail}</p>
        {action && (
          <Link
            href={action.href}
            className="mt-4 block w-full py-3 rounded-2xl bg-teal-400 text-white font-bold"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
