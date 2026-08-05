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

  // 진실의 원천은 서버다. 미로그인·무소속 상태는 middleware가 이미 걸러내므로
  // 여기서는 리다이렉트하지 않고 store를 채우기만 한다.
  const { data: membership } = useQuery({
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
