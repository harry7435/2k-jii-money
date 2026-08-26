"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getAssetAccounts,
  getAssetSnapshots,
  getAssetSnapshotHistory,
  getSavingsHistory,
  upsertAssetSnapshot,
  createDefaultAssetAccounts,
} from "@/src/lib/supabase/queries";
import {
  getCurrentYearMonth,
  formatCurrency,
  formatYearMonth,
  prevMonth,
} from "@/src/lib/utils/formatters";
import { MonthSelector } from "@/src/components/MonthSelector";
import { MonthRangeSelector } from "@/src/components/MonthRangeSelector";
import { AddAccountModal } from "@/src/components/assets/AddAccountModal";
import { EditAccountModal } from "@/src/components/assets/EditAccountModal";
import { AssetTrendChart } from "@/src/components/assets/AssetTrendChart";
import { SavingsTrendChart } from "@/src/components/assets/SavingsTrendChart";
import { AssetComparisonModal } from "@/src/components/assets/AssetComparisonModal";
import {
  buildMonthList,
  buildMonthRange,
  aggregateMonthlySavings,
} from "@/src/lib/utils/trendUtils";
import {
  ASSET_ACCOUNT_TYPE_MAP,
  ASSET_TYPE_ORDER,
} from "@/src/lib/constants/assets";
import { AssetsSkeleton } from "@/src/components/skeletons/AssetsSkeleton";
import type { AssetAccount } from "@2k-jii-money/supabase-types";

export default function AssetsPage() {
  const { family } = useFamilyStore();
  const familyId = family?.id ?? "";
  const qc = useQueryClient();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  // 차트 범위. 기본값은 최근 12개월 — 상단 월 선택기와는 독립적으로 움직인다
  const [range, setRange] = useState(() => {
    const recent = buildMonthList(12);
    return { from: recent[0], to: recent[recent.length - 1] };
  });
  const [editingAccount, setEditingAccount] = useState<AssetAccount | null>(
    null,
  );

  const {
    data: accounts = [],
    isSuccess: accountsLoaded,
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: ["assetAccounts", familyId],
    queryFn: () => getAssetAccounts(familyId),
    enabled: !!familyId,
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ["assetSnapshots", familyId, yearMonth],
    queryFn: () => getAssetSnapshots(familyId, yearMonth),
    enabled: !!familyId,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["assetSnapshotHistory", familyId, range.from, range.to],
    queryFn: () => getAssetSnapshotHistory(familyId, range.from, range.to),
    enabled: !!familyId,
  });

  const { data: savingsTx = [], isLoading: savingsLoading } = useQuery({
    queryKey: ["savingsHistory", familyId, range.from, range.to],
    queryFn: () => getSavingsHistory(familyId, range.from, range.to),
    enabled: !!familyId,
  });

  const savingsByMonth = useMemo(
    () =>
      aggregateMonthlySavings(savingsTx, buildMonthRange(range.from, range.to)),
    [savingsTx, range.from, range.to],
  );

  // 기존 가족인데 asset_accounts가 없으면 자동 생성
  const initMutation = useMutation({
    mutationFn: () => createDefaultAssetAccounts(familyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assetAccounts", familyId] });
    },
  });

  useEffect(() => {
    if (accountsLoaded && accounts.length === 0 && !initMutation.isPending) {
      initMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountsLoaded, accounts.length]);

  // 지난달 복사
  const prevYearMonth = prevMonth(yearMonth);
  const { data: prevSnapshots = [] } = useQuery({
    queryKey: ["assetSnapshots", familyId, prevYearMonth],
    queryFn: () => getAssetSnapshots(familyId, prevYearMonth),
    enabled: !!familyId,
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      for (const s of prevSnapshots) {
        await upsertAssetSnapshot(familyId, s.account_id, yearMonth, s.amount);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["assetSnapshots", familyId, yearMonth],
      });
      qc.invalidateQueries({ queryKey: ["assetSnapshotHistory", familyId] });
    },
  });

  const isLoading =
    accountsLoading || snapshotsLoading || historyLoading || savingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 space-y-4">
          <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
          <AssetsSkeleton />
        </div>
      </div>
    );
  }

  // 스냅샷 맵: account_id → 스냅샷 (금액과 마지막 수정 시각을 함께 쓴다)
  const snapshotMap = new Map(snapshots.map((s) => [s.account_id, s]));
  const amountOf = (accountId: string) =>
    snapshotMap.get(accountId)?.amount ?? 0;

  // 타입별 그룹핑
  const groupedAccounts = ASSET_TYPE_ORDER.map((type) => ({
    type,
    ...ASSET_ACCOUNT_TYPE_MAP[type],
    accounts: accounts.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  // 합계 계산
  const assetTotal = accounts
    .filter((a) => a.account_type !== "liability")
    .reduce((sum, a) => sum + amountOf(a.id), 0);
  const liabilityTotal = accounts
    .filter((a) => a.account_type === "liability")
    .reduce((sum, a) => sum + amountOf(a.id), 0);
  const netWorth = assetTotal - liabilityTotal;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-4">
        <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

        {/* 요약 카드 */}
        <div className="bg-linear-to-r from-teal-400 to-teal-500 rounded-2xl p-4 text-white">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-xs opacity-80">자산</p>
              <p className="text-sm font-bold mt-1">
                {assetTotal.toLocaleString("ko-KR")}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">부채</p>
              <p className="text-sm font-bold mt-1 text-red-200">
                {liabilityTotal.toLocaleString("ko-KR")}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-80">합계</p>
              <p className="text-sm font-bold mt-1">
                {netWorth.toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        </div>

        {/* 전월 대비 변화 */}
        <button
          onClick={() => setShowComparison(true)}
          className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-white text-sm font-medium text-gray-600 active:bg-gray-50"
        >
          <span className="material-symbols-outlined text-lg">
            compare_arrows
          </span>
          전월 대비 변화
        </button>

        {/* 지난달 복사 버튼 */}
        {snapshots.length === 0 && prevSnapshots.length > 0 && (
          <button
            onClick={() => copyMutation.mutate()}
            disabled={copyMutation.isPending}
            className="w-full py-2.5 rounded-xl border border-teal-400 text-teal-600 text-sm font-medium disabled:opacity-40"
          >
            {copyMutation.isPending
              ? "복사 중..."
              : `지난달(${formatYearMonth(prevYearMonth)}) 데이터 복사`}
          </button>
        )}

        {/* 계좌 그룹 목록 */}
        {groupedAccounts.map((group) => {
          const groupTotal = group.accounts.reduce(
            (sum, a) => sum + amountOf(a.id),
            0,
          );
          return (
            <div key={group.type} className="bg-white rounded-2xl">
              {/* 그룹 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-gray-500">
                    {group.icon}
                  </span>
                  <span className="font-bold text-sm">{group.label}</span>
                </div>
                <span
                  className={`text-sm font-bold ${group.type === "liability" ? "text-red-500" : "text-blue-600"}`}
                >
                  {formatCurrency(groupTotal)}
                </span>
              </div>

              {/* 계좌 행 */}
              {group.accounts.map((account) => {
                const amount = amountOf(account.id);

                return (
                  <button
                    key={account.id}
                    onClick={() => setEditingAccount(account)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-sm text-gray-700 font-medium">
                      {account.name}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {formatCurrency(amount)}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* 계좌 추가 버튼 */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          계좌 추가
        </button>

        {/* 추세 차트 */}
        <MonthRangeSelector
          from={range.from}
          to={range.to}
          onChange={(from, to) => setRange({ from, to })}
        />
        <AssetTrendChart snapshots={history} accounts={accounts} />
        <SavingsTrendChart data={savingsByMonth} />

        <p className="text-center text-xs text-gray-500 pb-2">
          {formatYearMonth(yearMonth)} 자산 현황
        </p>
      </div>

      {showAddModal && (
        <AddAccountModal
          familyId={familyId}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showComparison && (
        <AssetComparisonModal
          accounts={accounts}
          snapshots={snapshots}
          prevSnapshots={prevSnapshots}
          yearMonth={yearMonth}
          prevYearMonth={prevYearMonth}
          onClose={() => setShowComparison(false)}
        />
      )}

      {editingAccount && (
        <EditAccountModal
          familyId={familyId}
          account={editingAccount}
          snapshot={snapshotMap.get(editingAccount.id) ?? null}
          yearMonth={yearMonth}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}
