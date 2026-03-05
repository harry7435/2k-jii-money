'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useFamilyStore } from '@/src/lib/store/familyStore'
import { getBudgets, getCategories, getTransactions } from '@/src/lib/supabase/queries'
import { getCurrentYearMonth, formatCurrency } from '@/src/lib/utils/formatters'
import { MonthSelector } from '@/src/components/MonthSelector'
import { SetBudgetModal } from '@/src/components/SetBudgetModal'
import { BudgetProgressBar } from '@/src/components/BudgetProgressBar'
import { CategoryIcon } from '@/src/components/CategoryIcon'
import { INCOME_CATEGORY_NAMES } from '@/src/lib/constants/categories'

export default function BudgetPage() {
  const { family } = useFamilyStore()
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)
  const [showModal, setShowModal] = useState(false)
  const familyId = family?.id ?? ''

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', familyId, yearMonth],
    queryFn: () => getBudgets(familyId, yearMonth),
    enabled: !!familyId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  })

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', familyId, yearMonth],
    queryFn: () => getTransactions(familyId, yearMonth),
    enabled: !!familyId,
  })

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  // 카테고리별 지출 합계
  const spentByCat = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount
      return acc
    }, {})

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spentByCat[b.category_id] ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

      {/* 총 예산 요약 */}
      {budgets.length > 0 && (
        <div className="mx-4 mt-3 p-4 rounded-2xl bg-teal-400 text-white space-y-3">
          <div className="flex justify-between text-sm">
            <span className="opacity-80">총 예산</span>
            <span className="font-bold">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="opacity-80">사용</span>
            <span className="font-bold">{formatCurrency(totalSpent)}</span>
          </div>
          <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="text-right text-sm font-bold">
            {totalSpent > totalBudget
              ? `${formatCurrency(totalSpent - totalBudget)} 초과`
              : `${formatCurrency(totalBudget - totalSpent)} 남음`}
          </div>
        </div>
      )}

      {/* 카테고리별 예산 목록 */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-2 px-4 pb-2">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <span className="material-symbols-outlined text-4xl mb-2">account_balance_wallet</span>
            예산을 설정해보세요
          </div>
        ) : (
          budgets.map((budget) => {
            const cat = catMap[budget.category_id]
            if (!cat || INCOME_CATEGORY_NAMES.includes(cat.name)) return null
            const spent = spentByCat[budget.category_id] ?? 0
            return (
              <div key={budget.id} className="bg-white rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} size="md" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{cat.name}</p>
                    <p className="text-xs text-gray-400">예산 {formatCurrency(budget.amount)}</p>
                  </div>
                </div>
                <BudgetProgressBar
                  budgetAmount={budget.amount}
                  spentAmount={spent}
                  color={cat.color}
                />
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center shadow-lg"
      >
        <Plus size={28} className="text-white" />
      </button>

      {showModal && (
        <SetBudgetModal
          familyId={familyId}
          categories={categories}
          yearMonth={yearMonth}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
