"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getAssetAccounts,
  getAssetSnapshots,
  getAssetSnapshotHistory,
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
import { AddAccountModal } from "@/src/components/assets/AddAccountModal";
import { EditAccountModal } from "@/src/components/assets/EditAccountModal";
import { AssetTrendChart } from "@/src/components/assets/AssetTrendChart";
import {
  ASSET_ACCOUNT_TYPE_MAP,
  ASSET_TYPE_ORDER,
} from "@/src/lib/constants/assets";
import type { AssetAccount } from "@2k-jii-money/supabase-types";

export default function AssetsPage() {
  const { family } = useFamilyStore();
  const familyId = family?.id ?? "";
  const qc = useQueryClient();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AssetAccount | null>(
    null,
  );

  const { data: accounts = [], isSuccess: accountsLoaded } = useQuery({
    queryKey: ["assetAccounts", familyId],
    queryFn: () => getAssetAccounts(familyId),
    enabled: !!familyId,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["assetSnapshots", familyId, yearMonth],
    queryFn: () => getAssetSnapshots(familyId, yearMonth),
    enabled: !!familyId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["assetSnapshotHistory", familyId],
    queryFn: () => getAssetSnapshotHistory(familyId, 12),
    enabled: !!familyId,
  });

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
    enabled: !!familyId && snapshots.length === 0,
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

  // 스냅샷 맵: account_id → amount
  const snapshotMap = new Map(snapshots.map((s) => [s.account_id, s.amount]));

  // 타입별 그룹핑
  const groupedAccounts = ASSET_TYPE_ORDER.map((type) => ({
    type,
    ...ASSET_ACCOUNT_TYPE_MAP[type],
    accounts: accounts.filter((a) => a.account_type === type),
  })).filter((g) => g.accounts.length > 0);

  // 합계 계산
  const assetTotal = accounts
    .filter((a) => a.account_type !== "liability")
    .reduce((sum, a) => sum + (snapshotMap.get(a.id) ?? 0), 0);
  const liabilityTotal = accounts
    .filter((a) => a.account_type === "liability")
    .reduce((sum, a) => sum + (snapshotMap.get(a.id) ?? 0), 0);
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
            (sum, a) => sum + (snapshotMap.get(a.id) ?? 0),
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
                const amount = snapshotMap.get(account.id) ?? 0;

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
        <AssetTrendChart snapshots={history} accounts={accounts} />

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

      {editingAccount && (
        <EditAccountModal
          familyId={familyId}
          account={editingAccount}
          currentAmount={snapshotMap.get(editingAccount.id) ?? 0}
          yearMonth={yearMonth}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}
