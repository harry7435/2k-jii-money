import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "M월 d일 (EEE)", { locale: ko });
}

export function formatTime(dateTime: string): string {
  const d = parseISO(dateTime);
  return format(d, "a h:mm", { locale: ko });
}

/** 정렬용 HH:mm 키. created_at ISO 타임스탬프 → "HH:mm" */
export function toTimeKey(dateTime: string): string {
  return format(parseISO(dateTime), "HH:mm");
}

export type TimeFormat = "24h" | "12h";

/** "HH:mm" 키를 표시 형식(24시 / 오전·오후)에 맞춰 렌더 */
export function formatTimeLabel(hhmm: string, fmt: TimeFormat): string {
  if (fmt === "24h") return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 거래의 표시용 시간 키. 입력 time 우선, 없으면 created_at 폴백 */
export function transactionTimeKey(t: {
  time?: string | null;
  created_at?: string | null;
}): string | null {
  return t.time ?? (t.created_at ? toTimeKey(t.created_at) : null);
}

export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${parseInt(month)}월`;
}

export function getCurrentYearMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function prevMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 2);
  return format(d, "yyyy-MM");
}

export function nextMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month);
  return format(d, "yyyy-MM");
}

export interface Delta {
  diff: number;
  pct: number | null;
}

/** 전월 대비 증감. prev가 0이면 비율은 null (0 나눗셈 방지) */
export function calcDelta(current: number, prev: number): Delta {
  const diff = current - prev;
  const pct = prev !== 0 ? Math.round((diff / Math.abs(prev)) * 100) : null;
  return { diff, pct };
}

export function monthDateRange(yearMonth: string): {
  from: string;
  to: string;
} {
  const [year, month] = yearMonth.split("-").map(Number);
  const from = `${yearMonth}-01`;
  const nextDate = new Date(year, month, 1);
  const to = format(nextDate, "yyyy-MM-dd");
  return { from, to };
}
