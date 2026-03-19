'use client'

import { formatCurrency } from '@/src/lib/utils/formatters'
import type { Transaction, Category } from '@2k-jii-money/supabase-types'
import { findMiddleCategory } from '@/src/lib/utils/categoryUtils'

interface SummarySectionProps {
  transactions: Transaction[]
  categories: Category[]
  type: 'income' | 'savings'
  title: string
}

export function SummarySection({ transactions, categories, type, title }: SummarySectionProps) {
  const filtered = transactions.filter((t) => t.type === type)
  const total = filtered.reduce((sum, t) => sum + t.amount, 0)

  // 소분류(또는 중분류)별 합계
  const byCategory = filtered.reduce<Record<string, { name: string; amount: number }>>((acc, t) => {
    const cat = categories.find((c) => c.id === t.category_id)
    const name = cat?.name ?? '기타'
    acc[name] = acc[name] ?? { name, amount: 0 }
    acc[name].amount += t.amount
    return acc
  }, {})

  const rows = Object.values(byCategory).sort((a, b) => b.amount - a.amount)

  if (total === 0) return null

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 font-medium">항목</th>
            <th className="text-right pb-2 font-medium">금액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-gray-50">
              <td className="py-2 text-gray-700">{row.name}</td>
              <td className="py-2 text-right font-semibold">{formatCurrency(row.amount)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="py-2">합계</td>
            <td className="py-2 text-right">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
