'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import type { Category } from '@2k-jii-money/supabase-types'
import { setBudget } from '@/src/lib/supabase/queries'
import { INCOME_CATEGORY_NAMES } from '@/src/lib/constants/categories'
import { CategoryIcon } from './CategoryIcon'

interface SetBudgetModalProps {
  familyId: string
  categories: Category[]
  yearMonth: string
  onClose: () => void
}

export function SetBudgetModal({ familyId, categories, yearMonth, onClose }: SetBudgetModalProps) {
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')

  const expenseCategories = categories.filter((c) => !INCOME_CATEGORY_NAMES.includes(c.name))

  const mutation = useMutation({
    mutationFn: () =>
      setBudget(familyId, categoryId, yearMonth, parseInt(amount.replace(/,/g, ''), 10)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', familyId, yearMonth] })
      onClose()
    },
  })

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '')
    setAmount(digits ? parseInt(digits, 10).toLocaleString('ko-KR') : '')
  }

  const canSubmit = categoryId && amount && !mutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">예산 설정</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-2 block">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  categoryId === cat.id
                    ? 'border-teal-400 bg-teal-50 text-teal-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">예산 금액</label>
          <div className="flex items-center border rounded-xl px-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-xl font-bold outline-none"
            />
            <span className="ml-1 text-gray-600">원</span>
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {mutation.isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
