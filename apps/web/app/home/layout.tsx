'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFamilyStore } from '@/src/lib/store/familyStore'

const TABS = [
  { href: '/home/transactions', icon: 'receipt_long', label: '내역' },
  { href: '/home/budget', icon: 'account_balance_wallet', label: '예산' },
  { href: '/home/dashboard', icon: 'bar_chart', label: '대시보드' },
  { href: '/home/settings', icon: 'settings', label: '설정' },
]

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const family = useFamilyStore((s) => s.family)

  useEffect(() => {
    if (!family) router.replace('/welcome')
  }, [family, router])

  if (!family) return null

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white">
      <div className="flex-1 overflow-y-auto pb-20">{children}</div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 flex z-40">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            >
              <span
                className={`material-symbols-outlined text-2xl ${
                  active ? 'text-teal-400' : 'text-gray-500'
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] ${active ? 'text-teal-400 font-semibold' : 'text-gray-500'}`}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
