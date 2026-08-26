"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { AssetAccount, AssetSnapshot } from "@2k-jii-money/supabase-types";
import { formatCurrency, formatYearMonth } from "@/src/lib/utils/formatters";
import { DeltaLine } from "@/src/components/DeltaLine";
import {
  ASSET_ACCOUNT_TYPE_MAP,
  ASSET_TYPE_ORDER,
} from "@/src/lib/constants/assets";

interface AssetComparisonModalProps {
  accounts: AssetAccount[];
  snapshots: AssetSnapshot[];
  prevSnapshots: AssetSnapshot[];
  yearMonth: string;
  prevYearMonth: string;
  onClose: () => void;
}

function amountMap(snapshots: AssetSnapshot[]): Map<string, number> {
  return new Map(snapshots.map((s) => [s.account_id, s.amount]));
}

export function AssetComparisonModal({
  accounts,
  snapshots,
  prevSnapshots,
  yearMonth,
  prevYearMonth,
  onClose,
}: AssetComparisonModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const current = amountMap(snapshots);
  const prev = amountMap(prevSnapshots);

  const sumBy = (
    map: Map<string, number>,
    predicate: (a: AssetAccount) => boolean,
  ) =>
    accounts
      .filter(predicate)
      .reduce((sum, a) => sum + (map.get(a.id) ?? 0), 0);

  const isLiability = (a: AssetAccount) => a.account_type === "liability";
  const assetTotal = sumBy(current, (a) => !isLiability(a));
  const prevAssetTotal = sumBy(prev, (a) => !isLiability(a));
  const liabilityTotal = sumBy(current, isLiability);
  const prevLiabilityTotal = sumBy(prev, isLiability);
  const netWorth = assetTotal - liabilityTotal;
  const prevNetWorth = prevAssetTotal - prevLiabilityTotal;

  const groups = ASSET_TYPE_ORDER.map((type) => ({
    type,
    ...ASSET_ACCOUNT_TYPE_MAP[type],
    accounts: accounts.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  const hasPrevData = prevSnapshots.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md bg-white rounded-t-2xl flex flex-col max-h-[90vh] md:rounded-2xl md:shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold">전월 대비 변화</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatYearMonth(prevYearMonth)} → {formatYearMonth(yearMonth)}
            </p>
          </div>
          <button onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {!hasPrevData ? (
          <div className="px-5 py-12 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl">
              compare_arrows
            </span>
            <p className="text-sm mt-2">
              비교할 {formatYearMonth(prevYearMonth)} 데이터가 없어요
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {/* 요약 */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-2xl p-3 text-center">
              {[
                {
                  label: "자산",
                  cur: assetTotal,
                  old: prevAssetTotal,
                  good: true,
                },
                {
                  label: "부채",
                  cur: liabilityTotal,
                  old: prevLiabilityTotal,
                  good: false,
                },
                {
                  label: "순자산",
                  cur: netWorth,
                  old: prevNetWorth,
                  good: true,
                },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-sm font-bold mt-1">
                    {s.cur.toLocaleString("ko-KR")}
                  </p>
                  <DeltaLine
                    current={s.cur}
                    prev={s.old}
                    positiveIsGood={s.good}
                  />
                </div>
              ))}
            </div>

            {/* 계좌별 변화 */}
            {groups.map((group) => (
              <div key={group.type}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-base text-gray-400">
                    {group.icon}
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {group.label}
                  </span>
                </div>
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
                  {group.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-start justify-between px-3 py-2.5"
                    >
                      <span className="text-sm text-gray-700 font-medium">
                        {account.name}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-800">
                          {formatCurrency(current.get(account.id) ?? 0)}
                        </p>
                        <DeltaLine
                          current={current.get(account.id) ?? 0}
                          prev={prev.get(account.id) ?? 0}
                          positiveIsGood={group.type !== "liability"}
                          newLabel="신규"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
