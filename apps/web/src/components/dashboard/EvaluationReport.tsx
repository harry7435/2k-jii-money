'use client'

import { formatCurrency } from '@/src/lib/utils/formatters'
import { EVALUATION_LABELS } from '@/src/lib/constants/categories'
import type { Transaction, Category } from '@2k-jii-money/supabase-types'
import { findMiddleCategory } from '@/src/lib/utils/categoryUtils'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function EvaluationReport({ transactions, categories }: Props) {
  // 변동지출만 대상
  const variableExpenses = transactions.filter((t) => {
    if (t.type !== 'expense') return false
    const middle = findMiddleCategory(t.category_id, categories)
    return !middle?.is_fixed
  })

  const total = variableExpenses.reduce((sum, t) => sum + t.amount, 0)
  if (total === 0) return null

  const byEval = variableExpenses.reduce<Record<string, number>>((acc, t) => {
    const key = t.evaluation ?? 'consumption'
    acc[key] = (acc[key] ?? 0) + t.amount
    return acc
  }, {})

  const evalEntries = (['consumption', 'waste', 'investment'] as const).map((key) => ({
    key,
    label: EVALUATION_LABELS[key],
    amount: byEval[key] ?? 0,
    percent: total > 0 ? (((byEval[key] ?? 0) / total) * 100).toFixed(1) : '0',
  }))

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">변동지출 평가</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b border-gray-100">
            {evalEntries.map((e) => (
              <th key={e.key} className="text-center pb-2 font-medium">{e.label}</th>
            ))}
            <th className="text-center pb-2 font-medium">합계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {evalEntries.map((e) => (
              <td key={e.key} className="py-2 text-center font-semibold">
                {formatCurrency(e.amount)}
              </td>
            ))}
            <td className="py-2 text-center font-bold">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
