"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  updateAssetAccount,
  upsertAssetSnapshot,
  deleteAssetAccount,
} from "@/src/lib/supabase/queries";
import type { AssetAccount } from "@2k-jii-money/supabase-types";

interface EditAccountModalProps {
  familyId: string;
  account: AssetAccount;
  currentAmount: number;
  yearMonth: string;
  onClose: () => void;
}

export function EditAccountModal({
  familyId,
  account,
  currentAmount,
  yearMonth,
  onClose,
}: EditAccountModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState(account.name);
  const [amount, setAmount] = useState(
    currentAmount ? currentAmount.toLocaleString("ko-KR") : "",
  );

  const handleAmountChange = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "");
    setAmount(digits ? parseInt(digits, 10).toLocaleString("ko-KR") : "");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = amount ? parseInt(amount.replace(/,/g, ""), 10) : 0;
      await Promise.all([
        name !== account.name
          ? updateAssetAccount(account.id, { name })
          : Promise.resolve(),
        upsertAssetSnapshot(familyId, account.id, yearMonth, parsedAmount),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assetAccounts", familyId] });
      qc.invalidateQueries({
        queryKey: ["assetSnapshots", familyId, yearMonth],
      });
      qc.invalidateQueries({ queryKey: ["assetSnapshotHistory", familyId] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAssetAccount(account.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assetAccounts", familyId] });
      qc.invalidateQueries({
        queryKey: ["assetSnapshots", familyId, yearMonth],
      });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 md:rounded-2xl md:shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">계좌 수정</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">계좌명</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">잔고</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="flex-1 text-right text-xl font-bold outline-none"
            />
            <span className="ml-1 text-gray-600">원</span>
          </div>
        </div>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || saveMutation.isPending}
          className="w-full py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {saveMutation.isPending ? "저장 중..." : "저장"}
        </button>

        <button
          onClick={() => {
            if (confirm(`"${account.name}" 계좌를 삭제하시겠습니까?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="w-full py-2 text-sm text-red-400"
        >
          계좌 삭제
        </button>
      </div>
    </div>
  );
}
