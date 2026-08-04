"use client";

import { useState } from "react";
import {
  DIAL_SLOTS,
  MINUTE_STEP,
  dialPoint,
  from24h,
  hourAtSlot,
  minuteAtSlot,
  setHour,
  setHour24,
  setMinute,
  to24h,
  type Period,
} from "@/src/lib/utils/timeUtils";

interface ClockDialProps {
  value: string; // HH:mm  (빈 문자열 = 미입력)
  onChange: (value: string) => void;
}

const CENTER = 100;
const LABEL_RADIUS = 74;
const MARKER_RADIUS = 18;

const PERIODS: { key: Period; label: string }[] = [
  { key: "AM", label: "오전" },
  { key: "PM", label: "오후" },
];

export function ClockDial({ value, onChange }: ClockDialProps) {
  const [step, setStep] = useState<"hour" | "minute">("hour");
  // 타이핑 중인 원문. null이면 커밋된 value를 그대로 보여준다.
  // 이게 있어야 칸을 비우거나 "9"까지만 친 중간 상태를 유지할 수 있다.
  const [typing, setTyping] = useState<string | null>(null);

  const { hour12, minute, period } = from24h(value);
  const isEmpty = value === "";

  const hourText = isEmpty
    ? ""
    : String(to24h(hour12, period)).padStart(2, "0");
  const minuteText = isEmpty ? "" : String(minute).padStart(2, "0");

  // 칸 번호는 정수가 아닐 수 있다. 53분이면 10.6칸 — 바늘은 그 실제 각도를 가리킨다
  const exactSlot = isEmpty
    ? null
    : step === "hour"
      ? hour12 % DIAL_SLOTS
      : minute / MINUTE_STEP;

  // 라벨이 붙은 칸에 정확히 걸릴 때만 그 숫자를 반전시킨다
  const labeledSlot =
    exactSlot !== null && Number.isInteger(exactSlot) ? exactSlot : -1;

  const marker = exactSlot !== null ? dialPoint(exactSlot, LABEL_RADIUS) : null;

  function selectSlot(index: number) {
    if (step === "hour") {
      onChange(setHour(value, hourAtSlot(index), period));
      setStep("minute");
    } else {
      onChange(setMinute(value, minuteAtSlot(index)));
    }
  }

  /** 범위를 벗어나거나 빈 입력은 커밋하지 않는다 — value는 항상 유효한 HH:mm */
  function type(raw: string, field: "hour" | "minute") {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setTyping(digits);
    if (digits === "") return;

    const n = Number(digits);
    if (field === "hour" && n <= 23) onChange(setHour24(value, n));
    if (field === "minute" && n <= 59) onChange(setMinute(value, n));
  }

  function focusField(field: "hour" | "minute", el: HTMLInputElement) {
    setStep(field);
    setTyping(null);
    el.select();
  }

  const fieldClass = (active: boolean) =>
    `w-14 bg-transparent text-center outline-none text-3xl font-extrabold tabular-nums rounded-lg transition-colors ${
      active ? "text-gray-900 bg-gray-100" : "text-gray-300"
    }`;

  return (
    <div className="px-4 pt-3 pb-2">
      {/* 상단 시각 — 입력칸 겸 단계 전환. 항상 24시 표기 */}
      <div className="flex items-center justify-center">
        <input
          inputMode="numeric"
          placeholder="--"
          value={step === "hour" && typing !== null ? typing : hourText}
          onChange={(e) => type(e.target.value, "hour")}
          onFocus={(e) => focusField("hour", e.target)}
          onBlur={() => setTyping(null)}
          className={fieldClass(step === "hour")}
          aria-label="시"
        />
        <span className="text-3xl font-extrabold text-gray-300">:</span>
        <input
          inputMode="numeric"
          placeholder="--"
          value={step === "minute" && typing !== null ? typing : minuteText}
          onChange={(e) => type(e.target.value, "minute")}
          onFocus={(e) => focusField("minute", e.target)}
          onBlur={() => setTyping(null)}
          className={fieldClass(step === "minute")}
          aria-label="분"
        />
      </div>
      <p className="text-center text-xs text-gray-400 mt-0.5">
        {step === "hour" ? "시" : "분"}을 고르거나 직접 입력하세요
      </p>

      <svg viewBox="0 0 200 200" className="w-48 mx-auto my-1 select-none">
        <circle cx={CENTER} cy={CENTER} r="94" className="fill-gray-100" />

        {marker && (
          <>
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + marker.x}
              y2={CENTER + marker.y}
              className="stroke-teal-500"
              strokeWidth="3"
            />
            <circle cx={CENTER} cy={CENTER} r="4" className="fill-teal-500" />
            {/* 라벨 위면 숫자를 덮는 큰 마커, 라벨 사이면 각도만 짚는 작은 점 */}
            <circle
              cx={CENTER + marker.x}
              cy={CENTER + marker.y}
              r={labeledSlot >= 0 ? MARKER_RADIUS : 6}
              className="fill-teal-500"
            />
          </>
        )}

        {Array.from({ length: DIAL_SLOTS }, (_, i) => {
          const { x, y } = dialPoint(i, LABEL_RADIUS);
          const isSelected = i === labeledSlot;
          const label =
            step === "hour"
              ? String(hourAtSlot(i))
              : String(minuteAtSlot(i)).padStart(2, "0");

          return (
            <g key={i} onClick={() => selectSlot(i)} className="cursor-pointer">
              {/* 터치 타겟 — 보이지 않지만 라벨보다 넓게 잡는다 */}
              <circle
                cx={CENTER + x}
                cy={CENTER + y}
                r={MARKER_RADIUS + 4}
                fill="transparent"
              />
              <text
                x={CENTER + x}
                y={CENTER + y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="17"
                className={
                  isSelected ? "fill-white font-bold" : "fill-gray-700"
                }
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 오전 / 오후 */}
      <div className="flex rounded-full border border-teal-200 overflow-hidden">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(setHour(value, hour12, key))}
            className={`flex-1 py-1.5 text-sm transition-colors ${
              !isEmpty && period === key
                ? "bg-teal-600 text-white font-bold"
                : "text-teal-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
