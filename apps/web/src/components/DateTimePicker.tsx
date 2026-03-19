'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  format, parse, isValid,
  startOfMonth, getDay, getDaysInMonth, addMonths, subMonths,
  isToday, isSameDay,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'

interface DateTimePickerProps {
  date: string   // yyyy-MM-dd
  time: string   // HH:mm  (빈 문자열 = 미입력)
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const selectedDate = useMemo(() => {
    if (!date) return null
    const d = parse(date, 'yyyy-MM-dd', new Date())
    return isValid(d) ? d : null
  }, [date])

  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date())

  const calendarCells = useMemo(() => {
    const firstDow = getDay(startOfMonth(viewMonth))
    const total = getDaysInMonth(viewMonth)
    const cells: (number | null)[] = Array(firstDow).fill(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    return cells
  }, [viewMonth])

  function selectDay(day: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    onDateChange(format(d, 'yyyy-MM-dd'))
    if (!time) onTimeChange('00:00')
  }

  const displayText = selectedDate
    ? format(selectedDate, 'yyyy년 M월 d일 (EEE)', { locale: ko }) + (time ? `  ${time}` : '')
    : '날짜 선택'

  const calendar = open ? createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setViewMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold">
            {format(viewMonth, 'yyyy년 M월', { locale: ko })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-medium py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 px-3 pb-2">
          {calendarCells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />

            const thisDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
            const isSelected = selectedDate ? isSameDay(thisDate, selectedDate) : false
            const isTodayDate = isToday(thisDate)
            const dow = idx % 7

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={`
                  aspect-square flex items-center justify-center text-sm rounded-full transition-colors
                  ${isSelected
                    ? 'bg-teal-400 text-white font-bold'
                    : isTodayDate
                      ? 'border border-teal-300 text-teal-600 font-semibold hover:bg-teal-50'
                      : dow === 0
                        ? 'text-red-400 hover:bg-gray-100'
                        : dow === 6
                          ? 'text-blue-400 hover:bg-gray-100'
                          : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* 시간 입력 */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-3">
          <Clock size={14} className="text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 shrink-0">시간</span>
          <input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-400"
          />
          {time && (
            <button
              type="button"
              onClick={() => onTimeChange('')}
              className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
            >
              지우기
            </button>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="border-t border-gray-100 px-4 py-3 flex justify-between">
          <button
            type="button"
            onClick={() => {
              onDateChange(format(new Date(), 'yyyy-MM-dd'))
              setViewMonth(new Date())
            }}
            className="text-sm text-teal-500 font-medium hover:text-teal-700"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            완료
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm transition-colors text-left ${
          open ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'
        }`}
      >
        <CalendarDays size={15} className="text-gray-400 shrink-0" />
        <span className={selectedDate ? 'text-gray-800 font-medium' : 'text-gray-400'}>
          {displayText}
        </span>
      </button>

      {calendar}
    </div>
  )
}
