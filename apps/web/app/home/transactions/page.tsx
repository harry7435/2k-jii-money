"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
  formatTime,
} from "@/src/lib/utils/formatters";
import { EVALUATION_LABELS } from "@/src/lib/constants/categories";
import { getCategoryPath } from "@/src/lib/utils/categoryUtils";
import { MonthSelector } from "@/src/components/MonthSelector";
import { AddTransactionModal } from "@/src/components/AddTransactionModal";
import { CategoryIcon } from "@/src/components/CategoryIcon";
import type { Transaction } from "@2k-jii-money/supabase-types";

export default function TransactionsPage() {
  const { family, member } = useFamilyStore();
  const qc = useQueryClient();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

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

  // 날짜별 그룹
  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, t) => {
      (acc[t.date] ??= []).push(t);
      return acc;
    },
    {},
  );
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  /** 카테고리 라벨: 중분류 > 소분류 */
  function getCatLabel(t: Transaction) {
    const path = getCategoryPath(t.category_id, categories);
    if (path.length >= 3) return `${path[1].name} > ${path[2].name}`;
    if (path.length === 2) return path[1].name;
    return path[0]?.name ?? "알 수 없음";
  }

  /** 카테고리 아이콘 (가장 구체적인 레벨) */
  function getCatDisplay(t: Transaction) {
    const cat = catMap[t.category_id];
    const path = getCategoryPath(t.category_id, categories);
    // 중분류의 아이콘/색상 사용 (더 의미있음)
    const middleCat = path.length >= 2 ? path[1] : cat;
    return middleCat ?? cat;
  }

  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

      {/* 월 요약 카드 */}
      {summary && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-teal-400 text-white grid grid-cols-4 gap-1">
          <div className="text-center">
            <p className="text-xs opacity-80">수입</p>
            <p className="font-bold text-xs">
              {formatCurrency(summary.income)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">저축</p>
            <p className="font-bold text-xs">
              {formatCurrency(summary.savings)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">지출</p>
            <p className="font-bold text-xs">
              {formatCurrency(summary.expense)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs opacity-80">잔액</p>
            <p className="font-bold text-xs">
              {formatCurrency(
                summary.income - summary.expense - summary.savings,
              )}
            </p>
          </div>
        </div>
      )}

      {/* 거래 목록 */}
      <div className="flex-1 overflow-y-auto mt-3 pb-2">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <span className="material-symbols-outlined text-4xl mb-2">
              receipt_long
            </span>
            내역이 없습니다
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <div className="px-4 py-1.5 bg-gray-50 text-xs text-gray-600 font-semibold">
                {formatDate(date)}
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
                    className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
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
                      <p className="text-sm font-semibold truncate">
                        {getCatLabel(t)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {mem?.nickname ?? ""}
                        {t.memo && ` · ${t.memo}`}
                        {ps && ` · ${ps.name}`}
                        {t.evaluation &&
                          ` · ${EVALUATION_LABELS[t.evaluation]}`}
                        {t.time
                          ? ` · ${t.time}`
                          : t.created_at && ` · ${formatTime(t.created_at)}`}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p
                        className={`font-bold text-sm ${
                          t.type === "income"
                            ? "text-blue-500"
                            : t.type === "savings"
                              ? "text-teal-500"
                              : "text-gray-900"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(t.id);
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
        className="fixed bottom-20 right-4 w-14 h-14 bg-teal-400 rounded-full flex items-center justify-center shadow-lg"
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
    </div>
  );
}
