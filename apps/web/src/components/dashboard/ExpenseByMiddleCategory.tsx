'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/src/lib/utils/formatters'
import type { Transaction, Category } from '@2k-jii-money/supabase-types'
import { findMiddleCategory } from '@/src/lib/utils/categoryUtils'
import { CategoryIcon } from '@/src/components/CategoryIcon'

interface SubRow {
  name: string
  icon: string | null
  color: string | null
  amount: number
  percent: string
}

interface MiddleRow {
  cat: Category
  amount: number
  rank: number
  percent: string
  subRows: SubRow[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function ExpenseByMiddleCategory({ transactions, categories }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const expenses = transactions.filter((t) => t.type === 'expense')
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0)

  if (totalExpense === 0) return null

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // 중분류별 집계 + 소분류 breakdown
  const byMiddle = expenses.reduce<
    Record<string, { cat: Category; amount: number; txBySubCat: Record<string, number> }>
  >((acc, t) => {
    const middle = findMiddleCategory(t.category_id, categories)
    if (!middle) return acc
    acc[middle.id] = acc[middle.id] ?? { cat: middle, amount: 0, txBySubCat: {} }
    acc[middle.id].amount += t.amount
    // 소분류별 금액 집계
    const subKey = t.category_id === middle.id ? '__etc__' : t.category_id
    acc[middle.id].txBySubCat[subKey] = (acc[middle.id].txBySubCat[subKey] ?? 0) + t.amount
    return acc
  }, {})

  const rows: MiddleRow[] = Object.values(byMiddle)
    .sort((a, b) => b.amount - a.amount)
    .map((row, i) => {
      // 소분류 행 생성
      const subRows: SubRow[] = Object.entries(row.txBySubCat)
        .map(([key, amount]) => {
          if (key === '__etc__') {
            return { name: '기타', icon: null, color: null, amount, percent: '' }
          }
          const cat = categoryMap.get(key)
          return {
            name: cat?.name ?? '기타',
            icon: cat?.icon ?? null,
            color: cat?.color ?? null,
            amount,
            percent: '',
          }
        })
        .sort((a, b) => b.amount - a.amount)
        .map((sub) => ({
          ...sub,
          percent: ((sub.amount / row.amount) * 100).toFixed(1),
        }))

      return {
        cat: row.cat,
        amount: row.amount,
        rank: i + 1,
        percent: ((row.amount / totalExpense) * 100).toFixed(1),
        subRows,
      }
    })

  const canExpand = (row: MiddleRow) => row.subRows.length > 1

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
          {rows.map((row) => {
            const isExpanded = expandedId === row.cat.id
            const expandable = canExpand(row)

            return (
              <React.Fragment key={row.cat.id}>
                <tr
                  className={`border-b border-gray-50 ${expandable ? 'cursor-pointer active:bg-gray-50' : ''}`}
                  onClick={expandable ? () => setExpandedId(isExpanded ? null : row.cat.id) : undefined}
                >
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      {expandable && (
                        <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 16 }}>
                          {isExpanded ? 'expand_more' : 'chevron_right'}
                        </span>
                      )}
                      <CategoryIcon icon={row.cat.icon} color={row.cat.color} size="sm" />
                      <span className="text-gray-700">{row.cat.name}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-semibold">{formatCurrency(row.amount)}</td>
                  <td className="py-2 text-right text-gray-600">{row.percent}%</td>
                  <td className="py-2 text-right text-gray-600">{row.rank}</td>
                </tr>
                {isExpanded &&
                  row.subRows.map((sub) => (
                    <tr key={sub.name} className="bg-gray-50/50">
                      <td className="py-1.5 pl-10">
                        <span className="text-xs text-gray-500">{sub.name}</span>
                      </td>
                      <td className="py-1.5 text-right text-xs text-gray-600">
                        {formatCurrency(sub.amount)}
                      </td>
                      <td className="py-1.5 text-right text-xs text-gray-400">{sub.percent}%</td>
                      <td></td>
                    </tr>
                  ))}
              </React.Fragment>
            )
          })}
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
