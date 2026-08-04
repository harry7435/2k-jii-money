"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  format,
  parse,
  isValid,
  startOfMonth,
  getDay,
  getDaysInMonth,
  addMonths,
  subMonths,
  isToday,
  isSameDay,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { ClockDial } from "./ClockDial";

interface DateTimePickerProps {
  date: string; // yyyy-MM-dd
  time: string; // HH:mm  (빈 문자열 = 미입력)
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"date" | "time">("date");

  const selectedDate = useMemo(() => {
    if (!date) return null;
    const d = parse(date, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : null;
  }, [date]);

  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date());

  const calendarCells = useMemo(() => {
    const firstDow = getDay(startOfMonth(viewMonth));
    const total = getDaysInMonth(viewMonth);
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }, [viewMonth]);

  function selectDay(day: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onDateChange(format(d, "yyyy-MM-dd"));
  }

  function openPicker() {
    setView("date");
    setOpen(true);
  }

  const displayText = selectedDate
    ? format(selectedDate, "yyyy년 M월 d일 (EEE)", { locale: ko }) +
      (time ? `  ${time}` : "")
    : "날짜 선택";

  function chipClass(active: boolean) {
    return `flex-1 text-center text-xs py-1.5 rounded-full border transition-colors ${
      active
        ? "bg-teal-600 border-teal-600 text-white font-bold"
        : "border-gray-200 text-gray-500"
    }`;
  }

  const calendar = open
    ? createPortal(
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 날짜 / 시간 전환 칩 */}
            <div className="flex gap-1.5 px-3 pt-3">
              <button
                type="button"
                onClick={() => setView("date")}
                className={chipClass(view === "date")}
              >
                {selectedDate
                  ? format(selectedDate, "M월 d일 (EEE)", { locale: ko })
                  : "날짜 선택"}
              </button>
              <button
                type="button"
                onClick={() => setView("time")}
                className={chipClass(view === "time")}
              >
                {time || "--:--"}
              </button>
            </div>

            {view === "date" ? (
              <>
                {/* 월 네비게이션 */}
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewMonth((m) => subMonths(m, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-semibold">
                    {format(viewMonth, "yyyy년 M월", { locale: ko })}
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
                <div className="grid grid-cols-7 px-3">
                  {WEEKDAYS.map((d, i) => (
                    <div
                      key={d}
                      className={`text-center text-xs font-medium py-1 ${
                        i === 0
                          ? "text-red-400"
                          : i === 6
                            ? "text-blue-400"
                            : "text-gray-400"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="grid grid-cols-7 px-3 pb-2">
                  {calendarCells.map((day, idx) => {
                    if (day === null) return <div key={`e-${idx}`} />;

                    const thisDate = new Date(
                      viewMonth.getFullYear(),
                      viewMonth.getMonth(),
                      day,
                    );
                    const isSelected = selectedDate
                      ? isSameDay(thisDate, selectedDate)
                      : false;
                    const isTodayDate = isToday(thisDate);
                    const dow = idx % 7;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={`
                      aspect-square flex items-center justify-center text-sm rounded-full transition-colors
                      ${
                        isSelected
                          ? "bg-teal-400 text-white font-bold"
                          : isTodayDate
                            ? "border border-teal-300 text-teal-600 font-semibold hover:bg-teal-50"
                            : dow === 0
                              ? "text-red-400 hover:bg-gray-100"
                              : dow === 6
                                ? "text-blue-400 hover:bg-gray-100"
                                : "text-gray-700 hover:bg-gray-100"
                      }
                    `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <ClockDial value={time} onChange={onTimeChange} />
            )}

            {/* 하단 버튼 */}
            <div className="border-t border-gray-100 px-4 py-3 flex justify-between items-center">
              {view === "date" ? (
                <button
                  type="button"
                  onClick={() => {
                    onDateChange(format(new Date(), "yyyy-MM-dd"));
                    setViewMonth(new Date());
                  }}
                  className="text-sm text-teal-500 font-medium hover:text-teal-700"
                >
                  오늘
                </button>
              ) : time ? (
                <button
                  type="button"
                  onClick={() => onTimeChange("")}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  시간 지우기
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`text-sm font-semibold ${
                  view === "time"
                    ? "text-teal-500 hover:text-teal-700"
                    : "text-gray-700 hover:text-gray-900"
                }`}
              >
                완료
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm transition-colors text-left ${
          open ? "border-teal-400 bg-teal-50" : "border-gray-200 bg-white"
        }`}
      >
        <CalendarDays size={15} className="text-gray-400 shrink-0" />
        <span
          className={
            selectedDate ? "text-gray-800 font-medium" : "text-gray-400"
          }
        >
          {displayText}
        </span>
      </button>

      {calendar}
    </div>
  );
}
