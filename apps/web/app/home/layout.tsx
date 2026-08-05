"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import { getCurrentMembership } from "@/src/lib/supabase/queries";

const TABS = [
  { href: "/home/transactions", icon: "receipt_long", label: "내역" },
  { href: "/home/budget", icon: "account_balance_wallet", label: "예산" },
  { href: "/home/dashboard", icon: "bar_chart", label: "대시보드" },
  { href: "/home/assets", icon: "account_balance", label: "자산" },
  { href: "/home/settings", icon: "settings", label: "설정" },
];

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const family = useFamilyStore((s) => s.family);
  const setFamily = useFamilyStore((s) => s.setFamily);
  const setMember = useFamilyStore((s) => s.setMember);

  // 진실의 원천은 서버다. 미로그인·무소속 상태는 proxy.ts가 이미 걸러내므로
  // 여기서는 리다이렉트하지 않고 store를 채우기만 한다.
  const {
    data: membership,
    isPending,
    error,
  } = useQuery({
    queryKey: ["membership"],
    queryFn: getCurrentMembership,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (membership) {
      setFamily(membership.family);
      setMember(membership.member);
    }
  }, [membership, setFamily, setMember]);

  // 아래 세 분기는 전부 "아무것도 안 뜨는 화면"을 막기 위한 것이다.
  // 예전에는 조회가 실패해도 null을 반환해 원인 없이 검은 화면만 남았다.
  if (error) {
    return (
      <StatusScreen
        title="가계부를 불러오지 못했습니다"
        detail={error instanceof Error ? error.message : String(error)}
      />
    );
  }

  if (isPending) {
    return (
      <StatusScreen title="불러오는 중..." detail="잠시만 기다려 주세요." />
    );
  }

  if (!membership) {
    return (
      <StatusScreen
        title="아직 가족에 속해 있지 않습니다"
        detail="가계부를 만들거나 초대 링크로 참여해 주세요."
        action={{ href: "/family-setup", label: "가족 설정으로 이동" }}
      />
    );
  }

  if (!family) return null;

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

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</div>
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
