'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { Category } from '@2k-jii-money/supabase-types'
import { addTransaction } from '@/src/lib/supabase/queries'
import { CategoryIcon } from './CategoryIcon'

interface AddTransactionModalProps {
  familyId: string
  memberId: string
  categories: Category[]
  yearMonth: string
  onClose: () => void
}

export function AddTransactionModal({
  familyId,
  memberId,
  categories,
  yearMonth,
  onClose,
}: AddTransactionModalProps) {
  const qc = useQueryClient()
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      addTransaction({
        familyId,
        memberId,
        categoryId,
        type,
        amount: parseInt(amount.replace(/,/g, ''), 10),
        memo: memo || undefined,
        date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', familyId, yearMonth] })
      qc.invalidateQueries({ queryKey: ['summary', familyId, yearMonth] })
      onClose()
    },
  })

  const filteredCategories = categories.filter((c) =>
    type === 'income'
      ? ['급여', '기타수입'].includes(c.name) || !c.is_default
      : !['급여', '기타수입'].includes(c.name)
  )

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '')
    setAmount(digits ? parseInt(digits, 10).toLocaleString('ko-KR') : '')
  }

  const canSubmit = amount && categoryId && !mutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">내역 추가</h2>
          <button onClick={onClose} className="p-1"><X size={20} /></button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setCategoryId('') }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                type === t ? 'bg-teal-400 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {t === 'expense' ? '지출' : '수입'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">금액</label>
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

        {/* Date */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-600 mb-2 block">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((cat) => (
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

        {/* Memo */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">메모 (선택)</label>
          <input
            type="text"
            placeholder="메모 입력"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 outline-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {mutation.isPending ? '저장 중...' : '저장'}
        </button>
        {mutation.isError && (
          <p className="text-red-500 text-sm text-center">저장에 실패했습니다.</p>
        )}
      </div>
    </div>
  )
}
