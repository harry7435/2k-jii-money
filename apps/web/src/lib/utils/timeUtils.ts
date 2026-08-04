/** 시계 다이얼 시간 선택용 순수 함수. DOM 의존 없음 */

export type Period = "AM" | "PM";

export interface Time12 {
  hour12: number; // 1~12
  minute: number; // 0~59
  period: Period;
}

/** 다이얼 칸 수 (12칸). 시는 12·1·2…11, 분은 0·5·10…55 */
export const DIAL_SLOTS = 12;

/** 분 다이얼 간격 */
export const MINUTE_STEP = 5;

const FALLBACK: Time12 = { hour12: 12, minute: 0, period: "AM" };

/** 12시간제 → 24시간제. 12 AM은 0시, 12 PM은 12시 */
export function to24h(hour12: number, period: Period): number {
  const base = hour12 % 12;
  return period === "PM" ? base + 12 : base;
}

/** "HH:mm" → 12시간제. 빈 값·형식 오류·범위 초과는 00:00으로 폴백 */
export function from24h(hhmm: string): Time12 {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return { ...FALLBACK };

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return { ...FALLBACK };

  return {
    hour12: h % 12 === 0 ? 12 : h % 12,
    minute: m,
    period: h < 12 ? "AM" : "PM",
  };
}

function toHHmm(hour24: number, minute: number): string {
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 분은 그대로 두고 시만 교체 */
export function setHour(hhmm: string, hour12: number, period: Period): string {
  const { minute } = from24h(hhmm);
  return toHHmm(to24h(hour12, period), minute);
}

/** 분은 그대로 두고 시만 교체 (24시간제 값을 직접 받는다 — 직접 입력용) */
export function setHour24(hhmm: string, hour24: number): string {
  const { minute } = from24h(hhmm);
  return toHHmm(hour24, minute);
}

/** 시는 그대로 두고 분만 교체 */
export function setMinute(hhmm: string, minute: number): string {
  const { hour12, period } = from24h(hhmm);
  return toHHmm(to24h(hour12, period), minute);
}

/**
 * 다이얼 칸 번호 → 중심 기준 좌표 오프셋.
 * index는 시각 값이 아니라 칸 번호(0~11). index 0이 12시 방향(위), 시계방향으로 증가.
 */
export function dialPoint(
  index: number,
  radius: number,
): { x: number; y: number } {
  const angle = ((index / DIAL_SLOTS) * 2 - 0.5) * Math.PI;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/** 시 다이얼 칸 번호 → 표시할 시(12·1·2…11) */
export function hourAtSlot(index: number): number {
  return index === 0 ? 12 : index;
}

/** 분 다이얼 칸 번호 → 표시할 분(0·5·10…55) */
export function minuteAtSlot(index: number): number {
  return index * MINUTE_STEP;
}
