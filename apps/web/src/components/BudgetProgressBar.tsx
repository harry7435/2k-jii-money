'use client'

import { formatCurrency } from '@/src/lib/utils/formatters'

interface BudgetProgressBarProps {
  budgetAmount: number
  spentAmount: number
  color: string
}

export function BudgetProgressBar({ budgetAmount, spentAmount, color }: BudgetProgressBarProps) {
  const ratio = budgetAmount > 0 ? Math.min(spentAmount / budgetAmount, 1) : 0
  const isOver = spentAmount > budgetAmount
  const remaining = budgetAmount - spentAmount

  return (
    <div className="space-y-1">
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: isOver ? '#EF4444' : color,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{formatCurrency(spentAmount)} 사용</span>
        <span className={isOver ? 'text-red-500 font-semibold' : ''}>
          {isOver
            ? `${formatCurrency(Math.abs(remaining))} 초과`
            : `${formatCurrency(remaining)} 남음`}
        </span>
      </div>
    </div>
  )
}
