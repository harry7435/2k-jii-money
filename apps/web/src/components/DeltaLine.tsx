"use client";

import { calcDelta, deltaState } from "@/src/lib/utils/formatters";

interface DeltaLineProps {
  current: number;
  prev: number;
  /** 증가가 좋은 값인지. 지출·부채는 false */
  positiveIsGood: boolean;
  /** 지난달 값이 없을 때 표시할 라벨. 없으면 아무것도 그리지 않는다 */
  newLabel?: string;
  className?: string;
}

// 색상 의미론: 지출·부채는 증가가 나쁨(빨강), 수입·저축·자산은 증가가 좋음(파랑)
export function DeltaLine({
  current,
  prev,
  positiveIsGood,
  newLabel,
  className = "",
}: DeltaLineProps) {
  const state = deltaState(current, prev);

  if (state === "none") return null;

  if (state === "new") {
    if (!newLabel) return null;
    return (
      <p className={`text-[10px] text-gray-400 mt-0.5 ${className}`}>
        {newLabel}
      </p>
    );
  }

  if (state === "same") {
    return (
      <p className={`text-[10px] text-gray-400 mt-0.5 ${className}`}>
        전월과 동일
      </p>
    );
  }

  const { diff, pct } = calcDelta(current, prev);
  const up = diff > 0;
  const good = up === positiveIsGood;

  return (
    <p
      className={`text-[10px] font-semibold mt-0.5 ${
        good ? "text-blue-500" : "text-red-500"
      } ${className}`}
    >
      {up ? "▲" : "▼"} {Math.abs(diff).toLocaleString("ko-KR")}
      {pct !== null && ` (${up ? "+" : "-"}${Math.abs(pct)}%)`}
    </p>
  );
}
