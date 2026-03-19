'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import 'react-day-picker/style.css'

interface DateTimePickerProps {
  date: string       // yyyy-MM-dd
  time: string       // HH:mm (빈 문자열 = 미입력)
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = date ? parse(date, 'yyyy-MM-dd', new Date()) : undefined

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleDaySelect(day: Date | undefined) {
    if (day && isValid(day)) {
      onDateChange(format(day, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  const displayDate = selected && isValid(selected)
    ? format(selected, 'yyyy년 M월 d일 (EEE)', { locale: ko })
    : '날짜 선택'

  return (
    <div className="flex gap-2">
      {/* 날짜 선택 버튼 + 팝오버 */}
      <div className="relative flex-1" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors ${
            open ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white'
          }`}
        >
          <CalendarDays size={15} className="text-gray-400 shrink-0" />
          <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{displayDate}</span>
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              locale={ko}
              defaultMonth={selected}
              components={{
                PreviousMonthButton: (props) => (
                  <button {...props} className="p-1 rounded-lg hover:bg-gray-100">
                    <ChevronLeft size={16} />
                  </button>
                ),
                NextMonthButton: (props) => (
                  <button {...props} className="p-1 rounded-lg hover:bg-gray-100">
                    <ChevronRight size={16} />
                  </button>
                ),
              }}
              classNames={{
                month_caption: 'flex items-center justify-center py-1 font-semibold text-sm',
                nav: 'flex items-center justify-between px-1 mb-1',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday: 'w-9 text-center text-xs text-gray-400 py-1',
                weeks: '',
                week: 'flex',
                day: 'w-9 h-9 flex items-center justify-center',
                day_button: 'w-8 h-8 rounded-full text-sm hover:bg-gray-100 transition-colors',
                selected: '[&>button]:bg-teal-400 [&>button]:text-white [&>button]:hover:bg-teal-500',
                today: '[&>button]:font-bold [&>button]:text-teal-600',
                outside: 'opacity-30',
                disabled: 'opacity-20 cursor-not-allowed',
              }}
            />
          </div>
        )}
      </div>

      {/* 시간 입력 */}
      <div className="relative">
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-400 w-28"
        />
        {time && (
          <button
            type="button"
            onClick={() => onTimeChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
