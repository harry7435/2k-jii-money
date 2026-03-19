'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { Category, Transaction, PaymentSource } from '@2k-jii-money/supabase-types'
import type { EvaluationType } from '@2k-jii-money/supabase-types'
import { addTransaction, updateTransaction, getPaymentSources } from '@/src/lib/supabase/queries'
import { CategoryIcon } from './CategoryIcon'
import { DateTimePicker } from './DateTimePicker'
import { MAJOR_CATEGORY_TYPE_MAP, EVALUATION_LABELS } from '@/src/lib/constants/categories'
import {
  getCategoriesByLevel,
  getChildCategories,
  getCategoryPath,
} from '@/src/lib/utils/categoryUtils'

interface AddTransactionModalProps {
  familyId: string
  memberId: string
  categories: Category[]
  yearMonth: string
  editingTransaction?: Transaction
  onClose: () => void
}

export function AddTransactionModal({
  familyId,
  memberId,
  categories,
  yearMonth,
  editingTransaction,
  onClose,
}: AddTransactionModalProps) {
  const qc = useQueryClient()
  const isEdit = !!editingTransaction

  // 수정 모드 시 카테고리 경로 복원
  const editPath = useMemo(() => {
    if (!editingTransaction) return null
    return getCategoryPath(editingTransaction.category_id, categories)
  }, [editingTransaction, categories])

  const majorCategories = useMemo(() => getCategoriesByLevel(categories, 1), [categories])

  const [majorCatId, setMajorCatId] = useState(editPath?.[0]?.id ?? '')
  const [middleCatId, setMiddleCatId] = useState(editPath?.[1]?.id ?? '')
  const [subCatId, setSubCatId] = useState(editPath?.[2]?.id ?? '')
  const [amount, setAmount] = useState(
    editingTransaction ? editingTransaction.amount.toLocaleString('ko-KR') : ''
  )
  const [date, setDate] = useState(
    editingTransaction?.date ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [time, setTime] = useState(editingTransaction?.time ?? '')
  const [memo, setMemo] = useState(editingTransaction?.memo ?? '')
  const [paymentSourceId, setPaymentSourceId] = useState(
    editingTransaction?.payment_source_id ?? ''
  )
  const [evaluation, setEvaluation] = useState<EvaluationType | ''>(
    editingTransaction?.evaluation ?? ''
  )

  const [savedCount, setSavedCount] = useState(0)
  const amountRef = useRef<HTMLInputElement>(null)

  // 거래출처 조회
  const { data: paymentSources = [] } = useQuery({
    queryKey: ['paymentSources', familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled: !!familyId,
  })

  // 파생 데이터
  const middleCategories = useMemo(
    () => (majorCatId ? getChildCategories(categories, majorCatId) : []),
    [categories, majorCatId]
  )
  const subCategories = useMemo(
    () => (middleCatId ? getChildCategories(categories, middleCatId) : []),
    [categories, middleCatId]
  )

  const selectedMajor = majorCategories.find((c) => c.id === majorCatId)
  const transactionType = selectedMajor
    ? MAJOR_CATEGORY_TYPE_MAP[selectedMajor.name] ?? 'expense'
    : 'expense'
  const isExpense = transactionType === 'expense'

  // 가장 구체적인 카테고리 ID
  const effectiveCategoryId = subCatId || middleCatId

  const resetForm = useCallback(() => {
    setMiddleCatId('')
    setSubCatId('')
    setAmount('')
    setTime('')
    setMemo('')
    setPaymentSourceId('')
    setEvaluation('')
  }, [])

  const invalidateQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['transactions', familyId, yearMonth] })
    qc.invalidateQueries({ queryKey: ['summary', familyId, yearMonth] })
  }, [qc, familyId, yearMonth])

  const addMutation = useMutation({
    mutationFn: () =>
      addTransaction({
        familyId,
        memberId,
        categoryId: effectiveCategoryId,
        type: transactionType,
        amount: parseInt(amount.replace(/,/g, ''), 10),
        memo: memo || undefined,
        date,
        time: time || undefined,
        paymentSourceId: paymentSourceId || undefined,
        evaluation: (isExpense && evaluation) ? evaluation as EvaluationType : undefined,
      }),
    onSuccess: () => {
      invalidateQueries()
      setSavedCount((c) => c + 1)
      resetForm()
      setTimeout(() => amountRef.current?.focus(), 0)
    },
  })

  const editMutation = useMutation({
    mutationFn: () =>
      updateTransaction(editingTransaction!.id, {
        categoryId: effectiveCategoryId,
        type: transactionType,
        amount: parseInt(amount.replace(/,/g, ''), 10),
        memo: memo || undefined,
        date,
        time: time || undefined,
        paymentSourceId: paymentSourceId || undefined,
        evaluation: (isExpense && evaluation) ? evaluation as EvaluationType : undefined,
      }),
    onSuccess: () => {
      invalidateQueries()
      onClose()
    },
  })

  const mutation = isEdit ? editMutation : addMutation

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, '')
    setAmount(digits ? parseInt(digits, 10).toLocaleString('ko-KR') : '')
  }

  const canSubmit = amount && effectiveCategoryId && !mutation.isPending

  const handleSubmit = useCallback(() => {
    if (canSubmit) mutation.mutate()
  }, [canSubmit, mutation])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{isEdit ? '내역 수정' : '내역 추가'}</h2>
          <button onClick={onClose} className="p-1">
            <X size={20} />
          </button>
        </div>

        {/* 대분류 선택 (수입/저축/지출) */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {majorCategories.map((mc) => (
            <button
              key={mc.id}
              onClick={() => {
                setMajorCatId(mc.id)
                setMiddleCatId('')
                setSubCatId('')
                setEvaluation('')
              }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                majorCatId === mc.id ? 'bg-teal-400 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {mc.name}
            </button>
          ))}
        </div>

        {/* 중분류 선택 */}
        {middleCategories.length > 0 && (
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">중분류</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {middleCategories.map((mc) => (
                <button
                  key={mc.id}
                  onClick={() => {
                    setMiddleCatId(mc.id)
                    setSubCatId('')
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    middleCatId === mc.id
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <CategoryIcon icon={mc.icon} color={mc.color} size="sm" />
                  {mc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 소분류 선택 */}
        {subCategories.length > 0 && (
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">소분류</label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
              {subCategories.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setSubCatId(sc.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    subCatId === sc.id
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {sc.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 금액 */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">금액</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2">
            <input
              ref={amountRef}
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

        {/* 날짜 & 시간 */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">날짜 / 시간</label>
          <DateTimePicker
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
          />
        </div>

        {/* 거래출처 */}
        {paymentSources.length > 0 && (
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">거래출처</label>
            <div className="flex flex-wrap gap-2">
              {paymentSources.map((ps: PaymentSource) => (
                <button
                  key={ps.id}
                  onClick={() => setPaymentSourceId(paymentSourceId === ps.id ? '' : ps.id)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    paymentSourceId === ps.id
                      ? 'border-teal-400 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {ps.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 지출평가 (지출 타입만) */}
        {isExpense && (
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">지출평가</label>
            <div className="flex gap-2">
              {(Object.entries(EVALUATION_LABELS) as [EvaluationType, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setEvaluation(evaluation === value ? '' : value)}
                    className={`flex-1 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      evaluation === value
                        ? value === 'consumption'
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : value === 'waste'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* 메모 */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">메모 (선택)</label>
          <input
            type="text"
            placeholder="메모 입력"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
          />
        </div>

        {/* 저장 */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
          >
            {mutation.isPending
              ? isEdit ? '수정 중...' : '저장 중...'
              : isEdit ? '수정' : '저장'}
            {!isEdit && savedCount > 0 && !mutation.isPending && (
              <span className="ml-2 text-sm opacity-80">({savedCount}건 저장됨)</span>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center hidden md:block">
          Enter로 {isEdit ? '수정' : '저장'} · 배경 클릭 또는 X로 닫기
        </p>
        {mutation.isError && (
          <p className="text-red-500 text-sm text-center">
            {isEdit ? '수정에' : '저장에'} 실패했습니다.
          </p>
        )}
      </div>
    </div>
  )
}
