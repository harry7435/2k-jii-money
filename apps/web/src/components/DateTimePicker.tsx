'use client'

import { CalendarDays } from 'lucide-react'

interface DateTimePickerProps {
  date: string       // yyyy-MM-dd
  time: string       // HH:mm (빈 문자열 = 미입력)
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
}

export function DateTimePicker({ date, time, onDateChange, onTimeChange }: DateTimePickerProps) {
  // datetime-local 형식: "yyyy-MM-ddTHH:mm"
  const datetimeValue = date ? (time ? `${date}T${time}` : `${date}T`) : ''

  function handleChange(value: string) {
    if (!value) return
    const [d, t] = value.split('T')
    if (d) onDateChange(d)
    if (t) onTimeChange(t)
    else onTimeChange('')
  }

  return (
    <div className="relative flex items-center border border-gray-200 rounded-xl px-3 py-2 focus-within:border-teal-400 bg-white">
      <CalendarDays size={15} className="text-gray-400 shrink-0 mr-2" />
      <input
        type="datetime-local"
        value={datetimeValue}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
      />
    </div>
  )
}
