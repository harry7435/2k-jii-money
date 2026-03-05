'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import { getTransactions, getCategories, getMonthlySummary } from '@/src/lib/supabase/queries'
import { getCurrentYearMonth, formatCurrency, formatYearMonth } from '@/src/lib/utils/formatters'
import { MonthSelector } from '@/src/components/MonthSelector'

export default function DashboardPage() {
  const { family } = useFamilyStore()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)
  const familyId = family?.id ?? ''

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', familyId, yearMonth],
    queryFn: () => getTransactions(familyId, yearMonth),
    enabled: !!familyId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  })

  const { data: summary } = useQuery({
    queryKey: ['summary', familyId, yearMonth],
    queryFn: () => getMonthlySummary(familyId, yearMonth),
    enabled: !!familyId,
  })

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  // 카테고리별 지출 (파이 차트)
  const expensesByCat = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount
      return acc
    }, {})

  const pieData = Object.entries(expensesByCat)
    .map(([catId, amount]) => ({
      name: catMap[catId]?.name ?? '기타',
      value: amount,
      color: catMap[catId]?.color ?? '#AEB6BF',
    }))
    .sort((a, b) => b.value - a.value)

  // 일별 지출 (바 차트)
  const dailyExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      const day = parseInt(t.date.split('-')[2], 10)
      acc[day] = (acc[day] ?? 0) + t.amount
      return acc
    }, {})

  const barData = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    amount: dailyExpense[i + 1] ?? 0,
  })).filter((d) => d.amount > 0)

  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 요약 카드 */}
        {summary && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-400 font-semibold">수입</p>
              <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(summary.income)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4">
              <p className="text-xs text-red-400 font-semibold">지출</p>
              <p className="text-lg font-bold text-red-500 mt-1">{formatCurrency(summary.expense)}</p>
            </div>
          </div>
        )}

        {/* 파이 차트 */}
        {pieData.length > 0 ? (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">카테고리별 지출</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            {/* 범례 */}
            <div className="mt-2 space-y-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center h-36 text-gray-400 text-sm">
            <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
            지출 데이터가 없습니다
          </div>
        )}

        {/* 일별 바 차트 */}
        {barData.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">일별 지출 추이</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}일`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `${l}일`} />
                <Bar dataKey="amount" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-2">{formatYearMonth(yearMonth)} 통계</p>
      </div>
    </div>
  )
}
