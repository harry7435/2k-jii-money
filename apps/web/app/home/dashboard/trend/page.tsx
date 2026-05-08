"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getTransactionHistory,
  getCategories,
} from "@/src/lib/supabase/queries";
import {
  buildMonthList,
  aggregateMonthlyTotals,
  summarizeMiddleCategories,
  aggregateMonthlyBySelectedCategories,
  aggregateMonthlyEvaluation,
} from "@/src/lib/utils/trendUtils";
import { MonthlyTotalsChart } from "@/src/components/trend/MonthlyTotalsChart";
import { MonthlyByCategoryChart } from "@/src/components/trend/MonthlyByCategoryChart";
import { MonthlyEvaluationChart } from "@/src/components/trend/MonthlyEvaluationChart";
import { CategorySelector } from "@/src/components/trend/CategorySelector";

const MONTHS = 12;
const DEFAULT_TOP_N = 5;

export default function TrendPage() {
  const { family } = useFamilyStore();
  const familyId = family?.id ?? "";

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactionHistory", familyId, MONTHS],
    queryFn: () => getTransactionHistory(familyId, MONTHS),
    enabled: !!familyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  });

  const monthList = useMemo(() => buildMonthList(MONTHS), []);
  const totals = useMemo(
    () => aggregateMonthlyTotals(transactions, monthList),
    [transactions, monthList],
  );
  const availableCategories = useMemo(
    () => summarizeMiddleCategories(transactions, categories),
    [transactions, categories],
  );
  const byEval = useMemo(
    () => aggregateMonthlyEvaluation(transactions, categories, monthList),
    [transactions, categories, monthList],
  );

  // 사용자 선택을 보존. null이면 "아직 선택 안 함" → 상위 5개 기본값 사용.
  const [userSelectedIds, setUserSelectedIds] = useState<string[] | null>(null);
  const defaultIds = useMemo(
    () => availableCategories.slice(0, DEFAULT_TOP_N).map((c) => c.id),
    [availableCategories],
  );
  const selectedIds = userSelectedIds ?? defaultIds;

  const byCategory = useMemo(
    () =>
      aggregateMonthlyBySelectedCategories(
        transactions,
        categories,
        monthList,
        selectedIds,
      ),
    [transactions, categories, monthList, selectedIds],
  );

  const hasData = transactions.length > 0;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <Link
          href="/home/dashboard"
          aria-label="뒤로가기"
          className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </Link>
        <h1 className="text-base font-bold">월별 추이</h1>
        <span className="ml-auto text-xs text-gray-400">최근 12개월</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 md:p-6">
        {!hasData && !txLoading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl">
              query_stats
            </span>
            <p className="text-sm mt-2">최근 12개월 거래 내역이 없어요</p>
          </div>
        ) : (
          <>
            <MonthlyTotalsChart data={totals} />

            <div className="space-y-2">
              <CategorySelector
                available={availableCategories}
                selectedIds={selectedIds}
                onChange={setUserSelectedIds}
              />
              {selectedIds.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
                  카테고리를 선택해주세요
                </div>
              ) : (
                <MonthlyByCategoryChart result={byCategory} />
              )}
            </div>

            <MonthlyEvaluationChart data={byEval} />
          </>
        )}
      </div>
    </div>
  );
}
