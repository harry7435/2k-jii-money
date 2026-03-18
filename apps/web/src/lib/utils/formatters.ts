import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'M월 d일 (EEE)', { locale: ko })
}

export function formatTime(dateTime: string): string {
  const d = parseISO(dateTime)
  return format(d, 'a h:mm', { locale: ko })
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}년 ${parseInt(month)}월`
}

export function getCurrentYearMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function prevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const d = new Date(year, month - 2)
  return format(d, 'yyyy-MM')
}

export function nextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const d = new Date(year, month)
  return format(d, 'yyyy-MM')
}

export function monthDateRange(yearMonth: string): { from: string; to: string } {
  const [year, month] = yearMonth.split('-').map(Number)
  const from = `${yearMonth}-01`
  const nextDate = new Date(year, month, 1)
  const to = format(nextDate, 'yyyy-MM-dd')
  return { from, to }
}
