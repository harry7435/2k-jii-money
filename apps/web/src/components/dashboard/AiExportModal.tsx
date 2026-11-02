"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, Transaction } from "@2k-jii-money/supabase-types";
import {
  getBudgets,
  getMonthlyNote,
  getPaymentSources,
} from "@/src/lib/supabase/queries";
import { buildAiExport } from "@/src/lib/utils/aiExport";
import { CopyTextModal } from "@/src/components/CopyTextModal";
import { formatYearMonth } from "@/src/lib/utils/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  yearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  prevSummary: { income: number; expense: number; savings: number } | undefined;
}

export function AiExportModal({
  isOpen,
  onClose,
  familyId,
  yearMonth,
  transactions,
  categories,
  prevSummary,
}: Props) {
  const [includeTransactions, setIncludeTransactions] = useState(false);
  const enabled = isOpen && !!familyId;

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets", familyId, yearMonth],
    queryFn: () => getBudgets(familyId, yearMonth),
    enabled,
  });
  const { data: paymentSources, isLoading: psLoading } = useQuery({
    queryKey: ["paymentSources", familyId],
    queryFn: () => getPaymentSources(familyId),
    enabled,
  });
  const { data: note, isLoading: noteLoading } = useQuery({
    queryKey: ["monthly-note", familyId, yearMonth],
    queryFn: () => getMonthlyNote(familyId, yearMonth),
    enabled,
  });

  const isLoading = budgetsLoading || psLoading || noteLoading;

  const text = useMemo(
    () =>
      buildAiExport({
        yearMonth,
        transactions,
        categories,
        budgets: budgets ?? [],
        note: note ?? null,
        paymentSources: paymentSources ?? [],
        prevSummary,
        includeTransactions,
      }),
    [
      yearMonth,
      transactions,
      categories,
      budgets,
      note,
      paymentSources,
      prevSummary,
      includeTransactions,
    ],
  );

  return (
    <CopyTextModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI 리포트용 데이터 (${formatYearMonth(yearMonth)})`}
      text={text}
      isLoading={isLoading}
    >
      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeTransactions}
            onChange={(e) => setIncludeTransactions(e.target.checked)}
          />
          거래 내역 포함
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          체크하면 각 거래의 메모도 함께 포함돼요.
        </p>
      </div>
    </CopyTextModal>
  );
}
