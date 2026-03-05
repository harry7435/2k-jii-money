"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { Category } from "@2k-jii-money/supabase-types";
import { setBudget } from "@/src/lib/supabase/queries";
import { CategoryIcon } from "./CategoryIcon";

interface SetBudgetModalProps {
  familyId: string;
  category?: Category | null;
  yearMonth: string;
  initialAmount?: number;
  onClose: () => void;
}

export function SetBudgetModal({
  familyId,
  category,
  yearMonth,
  initialAmount,
  onClose,
}: SetBudgetModalProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(
    initialAmount ? initialAmount.toLocaleString("ko-KR") : "",
  );

  const mutation = useMutation({
    mutationFn: () =>
      setBudget(
        familyId,
        category?.id ?? null,
        yearMonth,
        parseInt(amount.replace(/,/g, ""), 10),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets", familyId, yearMonth] });
      onClose();
    },
  });

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "");
    setAmount(digits ? parseInt(digits, 10).toLocaleString("ko-KR") : "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {category ? "카테고리 예산 설정" : "이번 달 총 예산 설정"}
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {category && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-400 bg-teal-50 text-teal-700 text-sm w-fit">
            <CategoryIcon icon={category.icon} color={category.color} size="sm" />
            {category.name}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-600 mb-1 block">예산 금액</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-xl font-bold outline-none"
              autoFocus
            />
            <span className="ml-1 text-gray-600">원</span>
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!amount || mutation.isPending}
          className="w-full py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {mutation.isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
