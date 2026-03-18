"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { X } from "lucide-react";
import type { Category } from "@2k-jii-money/supabase-types";
import { addTransaction } from "@/src/lib/supabase/queries";
import { CategoryIcon } from "./CategoryIcon";

interface AddTransactionModalProps {
  familyId: string;
  memberId: string;
  categories: Category[];
  yearMonth: string;
  onClose: () => void;
}

export function AddTransactionModal({
  familyId,
  memberId,
  categories,
  yearMonth,
  onClose,
}: AddTransactionModalProps) {
  const qc = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [categoryId, setCategoryId] = useState("");
  const [memo, setMemo] = useState("");

  const [savedCount, setSavedCount] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setAmount("");
    setCategoryId("");
    setMemo("");
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      addTransaction({
        familyId,
        memberId,
        categoryId,
        type,
        amount: parseInt(amount.replace(/,/g, ""), 10),
        memo: memo || undefined,
        date,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", familyId, yearMonth] });
      qc.invalidateQueries({ queryKey: ["summary", familyId, yearMonth] });
      setSavedCount((c) => c + 1);
      resetForm();
      // 저장 후 금액 입력에 포커스
      setTimeout(() => amountRef.current?.focus(), 0);
    },
  });

  const filteredCategories = categories.filter((c) =>
    type === "income"
      ? ["급여", "기타수입"].includes(c.name) || !c.is_default
      : !["급여", "기타수입"].includes(c.name),
  );

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "");
    setAmount(digits ? parseInt(digits, 10).toLocaleString("ko-KR") : "");
  };

  const canSubmit = amount && categoryId && !mutation.isPending;

  const handleSubmit = useCallback(() => {
    if (canSubmit) mutation.mutate();
  }, [canSubmit, mutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">내역 추가</h2>
          <button onClick={onClose} className="p-1">
            <X size={20} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                type === t ? "bg-teal-400 text-white" : "bg-white text-gray-600"
              }`}
            >
              {t === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">금액</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2">
            <input
              ref={amountRef}
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-xl font-bold outline-none"
            />
            <span className="ml-1 text-gray-600">원</span>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs text-gray-600 mb-2 block">카테고리</label>
          <div className="flex flex-wrap gap-2 max-h-37.5 overflow-y-auto">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  categoryId === cat.id
                    ? "border-teal-400 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="text-xs text-gray-600 mb-1 block">
            메모 (선택)
          </label>
          <input
            type="text"
            placeholder="메모 입력"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
          >
            {mutation.isPending ? "저장 중..." : "저장"}
            {savedCount > 0 && !mutation.isPending && (
              <span className="ml-2 text-sm opacity-80">
                ({savedCount}건 저장됨)
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center hidden md:block">
          Enter로 저장 · 배경 클릭 또는 X로 닫기
        </p>
        {mutation.isError && (
          <p className="text-red-500 text-sm text-center">
            저장에 실패했습니다.
          </p>
        )}
      </div>
    </div>
  );
}
