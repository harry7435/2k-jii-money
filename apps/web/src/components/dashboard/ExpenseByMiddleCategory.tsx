'use client'

import { formatCurrency } from '@/src/lib/utils/formatters'
import type { Transaction, Category } from '@2k-jii-money/supabase-types'
import { findMiddleCategory } from '@/src/lib/utils/categoryUtils'
import { CategoryIcon } from '@/src/components/CategoryIcon'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function ExpenseByMiddleCategory({ transactions, categories }: Props) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

  if (totalExpense === 0) return null

  // 중분류별 집계
  const byMiddle = expenses.reduce<Record<string, { cat: Category; amount: number }>>((acc, t) => {
    const middle = findMiddleCategory(t.category_id, categories)
    if (!middle) return acc
    acc[middle.id] = acc[middle.id] ?? { cat: middle, amount: 0 }
    acc[middle.id].amount += t.amount
    return acc
  }, {})

  const rows = Object.values(byMiddle)
    .sort((a, b) => b.amount - a.amount)
    .map((row, i) => ({
      ...row,
      rank: i + 1,
      percent: ((row.amount / totalExpense) * 100).toFixed(1),
    }))

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">지출 현황</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 font-medium">항목</th>
            <th className="text-right pb-2 font-medium">지출금액</th>
            <th className="text-right pb-2 font-medium">비중</th>
            <th className="text-right pb-2 font-medium">Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cat.id} className="border-b border-gray-50">
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <CategoryIcon icon={row.cat.icon} color={row.cat.color} size="sm" />
                  <span className="text-gray-700">{row.cat.name}</span>
                </div>
              </td>
              <td className="py-2 text-right font-semibold">{formatCurrency(row.amount)}</td>
              <td className="py-2 text-right text-gray-600">{row.percent}%</td>
              <td className="py-2 text-right text-gray-600">{row.rank}</td>
            </tr>
          ))}
          <tr className="font-bold border-t border-gray-200">
            <td className="py-2">합계</td>
            <td className="py-2 text-right">{formatCurrency(totalExpense)}</td>
            <td className="py-2 text-right">100%</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
