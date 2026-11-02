"use client";

import { useMemo } from "react";
import type {
  AssetAccount,
  AssetSnapshot,
  Transaction,
} from "@2k-jii-money/supabase-types";
import { CopyTextModal } from "@/src/components/CopyTextModal";
import { buildAssetAiExport } from "@/src/lib/utils/aiExport";
import { formatYearMonth } from "@/src/lib/utils/formatters";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  yearMonth: string;
  accounts: AssetAccount[];
  snapshots: AssetSnapshot[];
  prevSnapshots: AssetSnapshot[];
  history: AssetSnapshot[];
  savingsTx: Transaction[];
  range: { from: string; to: string };
}

export function AssetAiExportModal({
  isOpen,
  onClose,
  yearMonth,
  accounts,
  snapshots,
  prevSnapshots,
  history,
  savingsTx,
  range,
}: Props) {
  const text = useMemo(
    () =>
      buildAssetAiExport({
        yearMonth,
        accounts,
        snapshots,
        prevSnapshots,
        history,
        savingsTx,
        range,
      }),
    [yearMonth, accounts, snapshots, prevSnapshots, history, savingsTx, range],
  );

  return (
    <CopyTextModal
      isOpen={isOpen}
      onClose={onClose}
      title={`AI 리포트용 데이터 (${formatYearMonth(yearMonth)})`}
      text={text}
    />
  );
}
