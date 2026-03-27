"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getBudgets,
  getCategories,
  getTransactions,
} from "@/src/lib/supabase/queries";
import {
  getCurrentYearMonth,
  formatCurrency,
} from "@/src/lib/utils/formatters";
import { MonthSelector } from "@/src/components/MonthSelector";
import { SetBudgetModal } from "@/src/components/SetBudgetModal";
import { CategoryIcon } from "@/src/components/CategoryIcon";
import { findMiddleCategory } from "@/src/lib/utils/categoryUtils";

export default function BudgetPage() {
  const { family } = useFamilyStore();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const familyId = family?.id ?? "";

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets", familyId, yearMonth],
    queryFn: () => getBudgets(familyId, yearMonth),
    enabled: !!familyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", familyId, yearMonth],
    queryFn: () => getTransactions(familyId, yearMonth),
    enabled: !!familyId,
  });

  // 총 예산 (category_id = null)
  const totalBudgetRow = budgets.find((b) => b.category_id === null);

  // 중분류별 지출 합계
  const spentByCat = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      const middle = findMiddleCategory(t.category_id, categories);
      if (middle) {
        acc[middle.id] = (acc[middle.id] ?? 0) + t.amount;
      }
      return acc;
    }, {});

  const totalSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const totalBudget = totalBudgetRow?.amount ?? 0;
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

      {/* 총 예산 카드 */}
      <div className="mx-4 mt-3 p-4 rounded-2xl bg-teal-400 text-white space-y-3 md:mx-6">
        <div className="flex items-center justify-between">
          <span className="text-sm opacity-80">이번 달 총 예산</span>
          <button
            onClick={() => setShowTotalModal(true)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-xs"
          >
            <Pencil size={13} />
            {totalBudgetRow ? "수정" : "설정"}
          </button>
        </div>

        {totalBudgetRow ? (
          <>
            <p className="text-3xl font-bold">{formatCurrency(totalBudget)}</p>
            <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-80">
                사용 {formatCurrency(totalSpent)}
              </span>
              <span className="font-bold">
                {totalSpent > totalBudget
                  ? `${formatCurrency(totalSpent - totalBudget)} 초과`
                  : `${formatCurrency(totalBudget - totalSpent)} 남음`}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm opacity-70">
            예산을 설정하면 지출 현황을 확인할 수 있어요
          </p>
        )}
      </div>

      {/* 카테고리별 지출 현황 */}
      <div className="flex-1 overflow-y-auto mt-3 px-4 pb-4 space-y-1 md:px-6 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2 md:col-span-2">
          카테고리별 지출
        </p>
        {Object.entries(spentByCat)
          .sort(([, a], [, b]) => b - a)
          .map(([catId, spent]) => {
            const cat = catMap[catId];
            if (!cat) return null;
            const pct =
              totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 100) : 0;
            return (
              <div
                key={catId}
                className="bg-white rounded-2xl px-4 py-3 space-y-1.5"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(spent)}
                  </span>
                </div>
                {totalBudget > 0 && (
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {Object.keys(spentByCat).length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm md:col-span-2">
            이번 달 지출 내역이 없어요
          </div>
        )}
      </div>

      {showTotalModal && (
        <SetBudgetModal
          familyId={familyId}
          category={null}
          yearMonth={yearMonth}
          initialAmount={totalBudgetRow?.amount}
          onClose={() => setShowTotalModal(false)}
        />
      )}
    </div>
  );
}
