"use client";

import { useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, SlidersHorizontal, X } from "lucide-react";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getTransactions,
  getCategories,
  getMembers,
  deleteTransaction,
  getMonthlySummary,
  getPaymentSources,
} from "@/src/lib/supabase/queries";
import {
  getCurrentYearMonth,
  formatCurrency,
  formatDate,
  formatTimeLabel,
  transactionTimeKey,
} from "@/src/lib/utils/formatters";
import { useUIPrefsStore } from "@/src/lib/store/uiPrefsStore";
import {
  EVALUATION_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/src/lib/constants/categories";
import {
  getCategoryPath,
  findMiddleCategory,
} from "@/src/lib/utils/categoryUtils";
import { MonthSelector } from "@/src/components/MonthSelector";
import { AddTransactionModal } from "@/src/components/AddTransactionModal";
import { CategoryIcon } from "@/src/components/CategoryIcon";
import {
  TransactionFilterPanel,
  type TransactionFilter,
} from "@/src/components/transactions/TransactionFilterPanel";
import type { Transaction } from "@2k-jii-money/supabase-types";

function parseFilter(
  searchParams: ReturnType<typeof useSearchParams>,
): TransactionFilter {
  return {
    types: (searchParams.get("types") ?? "").split(",").filter(Boolean),
    middleCategoryId: searchParams.get("middleCategoryId") ?? "",
    subCategoryId: searchParams.get("subCategoryId") ?? "",
    evaluations: (searchParams.get("evaluations") ?? "")
      .split(",")
      .filter(Boolean),
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function TransactionsPageInner() {
  const { family, member } = useFamilyStore();
  const timeFormat = useUIPrefsStore((s) => s.timeFormat);
  const toggleTimeFormat = useUIPrefsStore((s) => s.toggleTimeFormat);
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [yearMonth, setYearMonth] = useState(
    () => searchParams.get("month") ?? getCurrentYearMonth(),
  );
  const [showModal, setShowModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const filter = useMemo(() => parseFilter(searchParams), [searchParams]);

  const familyId = family?.id ?? "";

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", familyId, yearMonth],
    queryFn: () => getTransactions(familyId, yearMonth),
    enabled: !!familyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", familyId],
    queryFn: () => getMembers(familyId),
    enabled: !!familyId,
  });

  const { data: paymentSources = [] } = useQuery({
    queryKey: ["paymentSources", familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled: !!familyId,
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", familyId, yearMonth],
    queryFn: () => getMonthlySummary(familyId, yearMonth),
    enabled: !!familyId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", familyId, yearMonth] });
      qc.invalidateQueries({ queryKey: ["summary", familyId, yearMonth] });
    },
  });

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const psMap = Object.fromEntries(paymentSources.map((ps) => [ps.id, ps]));

  function applyFilter(f: TransactionFilter) {
    const params = new URLSearchParams();
    // month는 현재 선택된 달을 유지
    const currentMonth = searchParams.get("month");
    if (currentMonth) params.set("month", currentMonth);
    if (f.types.length > 0) params.set("types", f.types.join(","));
    if (f.middleCategoryId) params.set("middleCategoryId", f.middleCategoryId);
    if (f.subCategoryId) params.set("subCategoryId", f.subCategoryId);
    if (f.evaluations.length > 0)
      params.set("evaluations", f.evaluations.join(","));
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  // 활성 필터 칩 목록
  const filterChips: { key: string; label: string; onRemove: () => void }[] =
    [];
  if (filter.types.length > 0) {
    filterChips.push({
      key: "types",
      label: filter.types.map((t) => TRANSACTION_TYPE_LABELS[t]).join(", "),
      onRemove: () => applyFilter({ ...filter, types: [] }),
    });
  }
  if (filter.middleCategoryId) {
    const cat = categories.find((c) => c.id === filter.middleCategoryId);
    filterChips.push({
      key: "middleCategoryId",
      label: cat?.name ?? "중분류",
      onRemove: () =>
        applyFilter({ ...filter, middleCategoryId: "", subCategoryId: "" }),
    });
  }
  if (filter.subCategoryId) {
    const cat = categories.find((c) => c.id === filter.subCategoryId);
    filterChips.push({
      key: "subCategoryId",
      label: cat?.name ?? "소분류",
      onRemove: () => applyFilter({ ...filter, subCategoryId: "" }),
    });
  }
  if (filter.evaluations.length > 0) {
    filterChips.push({
      key: "evaluations",
      label: filter.evaluations.map((e) => EVALUATION_LABELS[e]).join(", "),
      onRemove: () => applyFilter({ ...filter, evaluations: [] }),
    });
  }
  if (filter.dateFrom || filter.dateTo) {
    filterChips.push({
      key: "date",
      label: `${filter.dateFrom || "처음"} ~ ${filter.dateTo || "현재"}`,
      onRemove: () => applyFilter({ ...filter, dateFrom: "", dateTo: "" }),
    });
  }

  const activeFilterCount = filterChips.length;

  // 필터 적용 (클라이언트 사이드)
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (filter.types.length > 0)
      result = result.filter((t) => filter.types.includes(t.type));
    if (filter.middleCategoryId)
      result = result.filter(
        (t) =>
          findMiddleCategory(t.category_id, categories)?.id ===
          filter.middleCategoryId,
      );
    if (filter.subCategoryId)
      result = result.filter((t) => t.category_id === filter.subCategoryId);
    if (filter.evaluations.length > 0)
      result = result.filter(
        (t) => t.evaluation && filter.evaluations.includes(t.evaluation),
      );
    if (filter.dateFrom)
      result = result.filter((t) => t.date >= filter.dateFrom);
    if (filter.dateTo) result = result.filter((t) => t.date <= filter.dateTo);
    return result;
  }, [transactions, filter, categories]);

  // 날짜별 그룹
  const grouped = filteredTransactions.reduce<Record<string, Transaction[]>>(
    (acc, t) => {
      (acc[t.date] ??= []).push(t);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // 각 날짜 그룹을 시간(입력 time > created_at 폴백) 내림차순 정렬
  for (const date of sortedDates) {
    grouped[date].sort((a, b) => {
      const ka = transactionTimeKey(a) ?? "";
      const kb = transactionTimeKey(b) ?? "";
      if (ka !== kb) return kb.localeCompare(ka);
      // 동일 시간이면 created_at 최신순
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });
  }

  function getDailyTotals(txs: Transaction[]) {
    let income = 0;
    let expense = 0;
    let savings = 0;
    for (const t of txs) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
      else if (t.type === "savings") savings += t.amount;
    }
    return { income, expense, savings };
  }

  /** 카테고리 라벨: 중분류 > 소분류 */
  function getCatLabel(t: Transaction) {
    const path = getCategoryPath(t.category_id, categories);
    if (path.length >= 3) return `${path[1].name} > ${path[2].name}`;
    if (path.length === 2) return path[1].name;
    return path[0]?.name ?? "알 수 없음";
  }

  /** 카테고리 아이콘 (중분류 기준) */
  function getCatDisplay(t: Transaction) {
    const cat = catMap[t.category_id];
    const path = getCategoryPath(t.category_id, categories);
    const middleCat = path.length >= 2 ? path[1] : cat;
    return middleCat ?? cat;
  }

  const isFiltered = activeFilterCount > 0;

  // 필터 적용 시 요약 수치를 filteredTransactions 기준으로 재계산
  const displaySummary = useMemo(() => {
    if (!isFiltered) return summary ?? null;
    let income = 0,
      expense = 0,
      savings = 0;
    for (const t of filteredTransactions) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
      else if (t.type === "savings") savings += t.amount;
    }
    return { income, expense, savings };
  }, [isFiltered, filteredTransactions, summary]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 md:px-6">
        <div className="flex-1">
          <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
        </div>
        <button
          onClick={toggleTimeFormat}
          className="shrink-0 pb-2 mr-1 text-xs font-medium text-gray-500 hover:text-gray-700"
          title="시간 표시 형식 전환"
        >
          {timeFormat === "24h" ? "24시" : "오전·오후"}
        </button>
        <div className="relative shrink-0 pb-2">
          <button
            onClick={() => setShowFilter(true)}
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
              isFiltered
                ? "bg-teal-400 border-teal-400 text-white"
                : "bg-white border-gray-200 text-gray-500"
            }`}
          >
            <SlidersHorizontal size={16} />
          </button>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </div>
      </div>

      {/* 활성 필터 칩 */}
      {filterChips.length > 0 && (
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto md:px-6">
          {filterChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1 shrink-0 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full border border-teal-200"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="ml-0.5 text-teal-400 hover:text-teal-600"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 월 요약 카드 */}
      {displaySummary && (
        <div className="mx-4 mt-1 p-3 rounded-2xl bg-teal-400 text-white grid grid-cols-4 gap-1 md:mx-6 md:p-4">
          <div className="text-center">
            <p className="text-xs opacity-80">수입</p>
            <p className="font-bold text-xs">
              {formatCurrency(displaySummary.income)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">저축</p>
            <p className="font-bold text-xs">
              {formatCurrency(displaySummary.savings)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">지출</p>
            <p className="font-bold text-xs">
              {formatCurrency(displaySummary.expense)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">잔액</p>
            <p className="font-bold text-xs">
              {formatCurrency(
                displaySummary.income -
                  displaySummary.expense -
                  displaySummary.savings,
              )}
            </p>
          </div>
        </div>
      )}

      {/* 거래 목록 */}
      <div className="flex-1 overflow-y-auto mt-3 pb-2">
        {isFiltered && (
          <p className="px-4 pb-1.5 text-xs text-gray-400 md:px-6">
            {filteredTransactions.length}건
          </p>
        )}
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <span className="material-symbols-outlined text-4xl mb-2">
              receipt_long
            </span>
            {isFiltered ? "조건에 맞는 내역이 없습니다" : "내역이 없습니다"}
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <div className="px-4 py-1.5 bg-gray-50 text-xs text-gray-600 font-semibold flex items-center justify-between md:px-6 md:text-sm">
                <span>{formatDate(date)}</span>
                {(() => {
                  const { income, expense, savings } = getDailyTotals(
                    grouped[date],
                  );
                  return (
                    <span className="flex gap-2 font-normal">
                      {income > 0 && (
                        <span className="flex items-baseline gap-0.5 text-blue-500">
                          <span className="text-[10px] font-semibold">
                            수입
                          </span>
                          {formatCurrency(income)}
                        </span>
                      )}
                      {expense > 0 && (
                        <span className="flex items-baseline gap-0.5 text-gray-500">
                          <span className="text-[10px] font-semibold">
                            지출
                          </span>
                          {formatCurrency(expense)}
                        </span>
                      )}
                      {savings !== 0 && (
                        <span
                          className={`flex items-baseline gap-0.5 ${savings < 0 ? "text-orange-500" : "text-teal-500"}`}
                        >
                          <span className="text-[10px] font-semibold">
                            저축
                          </span>
                          {savings < 0 ? "-" : ""}
                          {formatCurrency(Math.abs(savings))}
                        </span>
                      )}
                    </span>
                  );
                })()}
              </div>
              {grouped[date].map((t) => {
                const displayCat = getCatDisplay(t);
                const mem = memberMap[t.member_id];
                const ps = t.payment_source_id
                  ? psMap[t.payment_source_id]
                  : null;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors md:px-6 md:py-4 md:gap-4"
                    onClick={() => {
                      setEditingTransaction(t);
                      setShowModal(true);
                    }}
                  >
                    {displayCat && (
                      <CategoryIcon
                        icon={displayCat.icon}
                        color={displayCat.color}
                        size="md"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate md:text-base">
                        {getCatLabel(t)}
                      </p>
                      <p className="text-xs text-gray-500 truncate md:whitespace-normal">
                        {mem?.nickname ?? ""}
                        {t.memo && ` · ${t.memo}`}
                        {ps && ` · ${ps.name}`}
                        {t.evaluation &&
                          ` · ${EVALUATION_LABELS[t.evaluation]}`}
                        {(() => {
                          const key = transactionTimeKey(t);
                          return key
                            ? ` · ${formatTimeLabel(key, timeFormat)}`
                            : "";
                        })()}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {(() => {
                        const isWithdrawal =
                          t.type === "savings" && t.amount < 0;
                        const sign =
                          t.type === "income" || t.type === "savings"
                            ? t.amount < 0
                              ? "-"
                              : "+"
                            : "-";
                        const colorClass =
                          t.type === "income"
                            ? "text-blue-500"
                            : t.type === "savings"
                              ? isWithdrawal
                                ? "text-orange-500"
                                : "text-teal-500"
                              : "text-gray-900";
                        return (
                          <p className={`font-bold text-sm ${colorClass}`}>
                            {sign}
                            {formatCurrency(Math.abs(t.amount))}
                          </p>
                        );
                      })()}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("이 내역을 삭제하시겠습니까?")) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingTransaction(null);
          setShowModal(true);
        }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center shadow-lg md:bottom-8 md:right-8"
      >
        <Plus size={28} className="text-white" />
      </button>

      {showModal && member && (
        <AddTransactionModal
          familyId={familyId}
          memberId={member.id}
          categories={categories}
          yearMonth={yearMonth}
          editingTransaction={editingTransaction ?? undefined}
          onClose={() => {
            setShowModal(false);
            setEditingTransaction(null);
          }}
        />
      )}

      {showFilter && (
        <TransactionFilterPanel
          onClose={() => setShowFilter(false)}
          categories={categories}
          currentFilter={filter}
          onApply={applyFilter}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageInner />
    </Suspense>
  );
}
