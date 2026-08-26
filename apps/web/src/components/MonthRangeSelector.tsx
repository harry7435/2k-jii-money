"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentYearMonth } from "@/src/lib/utils/formatters";

interface MonthRangeSelectorProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

type Edge = "from" | "to";

function ym(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function label(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${y}년 ${Number(m)}월`;
}

export function MonthRangeSelector({
  from,
  to,
  onChange,
}: MonthRangeSelectorProps) {
  const [editing, setEditing] = useState<Edge | null>(null);
  const [cursorYear, setCursorYear] = useState(2000);

  const currentYM = getCurrentYearMonth();

  const open = (edge: Edge) => {
    setCursorYear(Number((edge === "from" ? from : to).slice(0, 4)));
    setEditing(edge);
  };

  // 범위가 뒤집히지 않도록 반대쪽 끝을 함께 당긴다
  const select = (picked: string) => {
    if (editing === "from") {
      onChange(picked, picked > to ? picked : to);
    } else {
      onChange(picked < from ? picked : from, picked);
    }
    setEditing(null);
  };

  const selectedYM = editing === "from" ? from : to;

  return (
    <div className="flex items-center justify-center gap-2 px-1">
      <button
        onClick={() => open("from")}
        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 active:bg-gray-50"
      >
        {label(from)}
      </button>
      <span className="text-xs text-gray-400">~</span>
      <button
        onClick={() => open("to")}
        className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 active:bg-gray-50"
      >
        {label(to)}
      </button>

      {editing !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/40"
            onClick={() => setEditing(null)}
          >
            <div
              className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 pt-4 pb-2 text-center text-sm font-bold">
                {editing === "from" ? "시작 월" : "종료 월"}
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <button
                  onClick={() => setCursorYear((y) => y - 1)}
                  aria-label="이전 해"
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-semibold text-sm">{cursorYear}년</span>
                <button
                  onClick={() => setCursorYear((y) => y + 1)}
                  aria-label="다음 해"
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 p-4 pt-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const value = ym(cursorYear, m);
                  const isFuture = value > currentYM;
                  const isSelected = value === selectedYM;
                  return (
                    <button
                      key={m}
                      disabled={isFuture}
                      onClick={() => select(value)}
                      className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-teal-400 text-white"
                          : isFuture
                            ? "text-gray-300"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {m}월
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
