'use client'

import { formatCurrency } from '@/src/lib/utils/formatters'
import type { Transaction, Category } from '@2k-jii-money/supabase-types'
import { findMiddleCategory } from '@/src/lib/utils/categoryUtils'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function FixedVsVariableExpense({ transactions, categories }: Props) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

  if (totalExpense === 0) return null

  // 고정/변동 분류 (중분류의 is_fixed 기준)
  let fixedTotal = 0
  let variableTotal = 0

  for (const t of expenses) {
    const middle = findMiddleCategory(t.category_id, categories)
    if (middle?.is_fixed) {
      fixedTotal += t.amount
    } else {
      variableTotal += t.amount
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">고정지출 vs 변동지출</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            <th className="text-left pb-2 font-medium">항목</th>
            <th className="text-right pb-2 font-medium">지출금액</th>
            <th className="text-right pb-2 font-medium">비중</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-50">
            <td className="py-2 text-gray-700">변동지출</td>
            <td className="py-2 text-right font-semibold">{formatCurrency(variableTotal)}</td>
            <td className="py-2 text-right text-gray-600">
              {totalExpense > 0 ? ((variableTotal / totalExpense) * 100).toFixed(1) : 0}%
            </td>
          </tr>
          <tr className="border-b border-gray-50">
            <td className="py-2 text-gray-700">고정지출</td>
            <td className="py-2 text-right font-semibold">{formatCurrency(fixedTotal)}</td>
            <td className="py-2 text-right text-gray-600">
              {totalExpense > 0 ? ((fixedTotal / totalExpense) * 100).toFixed(1) : 0}%
            </td>
          </tr>
          <tr className="font-bold border-t border-gray-200">
            <td className="py-2">합계</td>
            <td className="py-2 text-right">{formatCurrency(totalExpense)}</td>
            <td className="py-2 text-right">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
