"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@2k-jii-money/supabase-types";
import {
  getCategoriesByLevel,
  getChildCategories,
} from "@/src/lib/utils/categoryUtils";
import { EVALUATION_LABELS } from "@/src/lib/constants/categories";

export interface TransactionFilter {
  types: string[];
  middleCategoryId: string;
  subCategoryId: string;
  evaluations: string[];
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTER: TransactionFilter = {
  types: [],
  middleCategoryId: "",
  subCategoryId: "",
  evaluations: [],
  dateFrom: "",
  dateTo: "",
};

interface Props {
  onClose: () => void;
  categories: Category[];
  currentFilter: TransactionFilter;
  onApply: (filter: TransactionFilter) => void;
}

const TYPE_OPTIONS = [
  { value: "income", label: "수입" },
  { value: "expense", label: "지출" },
  { value: "savings", label: "저축" },
];

const EVAL_OPTIONS = [
  { value: "consumption", label: EVALUATION_LABELS.consumption },
  { value: "waste", label: EVALUATION_LABELS.waste },
  { value: "investment", label: EVALUATION_LABELS.investment },
];

export function TransactionFilterPanel({
  onClose,
  categories,
  currentFilter,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<TransactionFilter>(currentFilter);
  const [show, setShow] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setShow(true));
    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleClose() {
    setShow(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(onClose, 280);
  }

  const middleCategories = getCategoriesByLevel(categories, 2);
  const subCategories = draft.middleCategoryId
    ? getChildCategories(categories, draft.middleCategoryId)
    : [];

  function toggleType(type: string) {
    setDraft((d) => {
      const next = d.types.includes(type)
        ? d.types.filter((t) => t !== type)
        : [...d.types, type];
      // expense가 빠지면 지출 평가 선택값도 초기화
      const evaluations =
        type === "expense" && d.types.includes("expense") ? [] : d.evaluations;
      return { ...d, types: next, evaluations };
    });
  }

  function toggleEval(val: string) {
    setDraft((d) => ({
      ...d,
      evaluations: d.evaluations.includes(val)
        ? d.evaluations.filter((e) => e !== val)
        : [...d.evaluations, val],
    }));
  }

  function setMiddleCategory(id: string) {
    setDraft((d) => ({ ...d, middleCategoryId: id, subCategoryId: "" }));
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      onClick={handleClose}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`relative w-full max-w-md bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] transition-[transform,opacity] duration-300 ease-out ${
          show
            ? "translate-y-0 md:opacity-100"
            : "translate-y-full md:translate-y-0 md:opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base">필터</h2>
          <button
            className="text-sm text-teal-500 font-semibold"
            onClick={() => setDraft(EMPTY_FILTER)}
          >
            초기화
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* 거래 유형 */}
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              거래 유형
            </p>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleType(opt.value)}
                  className={`flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    draft.types.includes(opt.value)
                      ? "bg-teal-400 text-white border-teal-400"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* 카테고리 */}
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">카테고리</p>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white mb-2"
              value={draft.middleCategoryId}
              onChange={(e) => setMiddleCategory(e.target.value)}
            >
              <option value="">중분류 전체</option>
              {middleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {draft.middleCategoryId && subCategories.length > 0 && (
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white"
                value={draft.subCategoryId}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, subCategoryId: e.target.value }))
                }
              >
                <option value="">소분류 전체</option>
                {subCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </section>

          {/* 지출 평가 (지출 포함되거나 유형 미선택 시) */}
          {(draft.types.length === 0 || draft.types.includes("expense")) && (
            <section>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                지출 평가
              </p>
              <div className="flex gap-2">
                {EVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => toggleEval(opt.value)}
                    className={`flex-1 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      draft.evaluations.includes(opt.value)
                        ? "bg-teal-400 text-white border-teal-400"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 날짜 범위 */}
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              날짜 범위
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                value={draft.dateFrom}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dateFrom: e.target.value }))
                }
              />
              <span className="text-gray-400 text-sm">~</span>
              <input
                type="date"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                value={draft.dateTo}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, dateTo: e.target.value }))
                }
              />
            </div>
          </section>
        </div>

        {/* 하단 적용 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            className="w-full py-3 bg-teal-400 text-white font-bold rounded-xl"
            onClick={() => {
              onApply(draft);
              handleClose();
            }}
          >
            적용하기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
