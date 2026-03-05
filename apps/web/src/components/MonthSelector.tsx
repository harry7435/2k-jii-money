'use client'

import { formatYearMonth, prevMonth, nextMonth } from '@/src/lib/utils/formatters'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  yearMonth: string
  onChange: (yearMonth: string) => void
}

export function MonthSelector({ yearMonth, onChange }: MonthSelectorProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      <button
        onClick={() => onChange(prevMonth(yearMonth))}
        className="p-1 rounded-full hover:bg-gray-100"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="font-semibold text-base">{formatYearMonth(yearMonth)}</span>
      <button
        onClick={() => onChange(nextMonth(yearMonth))}
        className="p-1 rounded-full hover:bg-gray-100"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
