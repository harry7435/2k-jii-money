"use client";

import { useState } from "react";
import { formatCurrency } from "@/src/lib/utils/formatters";
import type { MiddleCategorySummary } from "@/src/lib/utils/trendUtils";

interface Props {
  available: MiddleCategorySummary[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CategorySelector({ available, selectedIds, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selectedIds);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onChange(available.map((c) => c.id));
  const clearAll = () => onChange([]);

  if (available.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 active:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500">tune</span>
          <span className="text-sm font-semibold">카테고리 선택</span>
          <span className="text-xs text-gray-400">
            {selectedIds.length} / {available.length}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-teal-500 font-semibold active:opacity-60"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 active:opacity-60"
            >
              전체 해제
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {available.map((c) => {
              const checked = selectedSet.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggle(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-gray-50"
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        checked
                          ? "bg-teal-400 border-teal-400"
                          : "border-gray-300"
                      }`}
                    >
                      {checked && (
                        <span className="material-symbols-outlined text-white text-[12px]">
                          check
                        </span>
                      )}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-sm flex-1 text-left">{c.name}</span>
                    <span className="text-xs text-gray-400">
                      {formatCurrency(c.total)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
