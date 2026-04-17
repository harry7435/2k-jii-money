"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { AssetAccountType } from "@2k-jii-money/supabase-types";
import { addAssetAccount } from "@/src/lib/supabase/queries";
import {
  ASSET_ACCOUNT_TYPE_MAP,
  ASSET_TYPE_ORDER,
} from "@/src/lib/constants/assets";

interface AddAccountModalProps {
  familyId: string;
  onClose: () => void;
}

export function AddAccountModal({ familyId, onClose }: AddAccountModalProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AssetAccountType>("bank");

  const mutation = useMutation({
    mutationFn: () => addAssetAccount(familyId, name.trim(), accountType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assetAccounts", familyId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md bg-white rounded-t-2xl p-5 space-y-4 md:rounded-2xl md:shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">계좌 추가</h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">계좌 유형</label>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPE_ORDER.map((type) => (
              <button
                key={type}
                onClick={() => setAccountType(type)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border ${
                  accountType === type
                    ? "border-teal-400 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {ASSET_ACCOUNT_TYPE_MAP[type].icon}
                </span>
                {ASSET_ACCOUNT_TYPE_MAP[type].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">계좌명</label>
          <input
            type="text"
            placeholder="예: 국민은행(익준), 토스증권"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-teal-400"
            autoFocus
          />
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="w-full py-3 rounded-xl bg-teal-400 text-white font-bold disabled:opacity-40"
        >
          {mutation.isPending ? "추가 중..." : "추가"}
        </button>
      </div>
    </div>
  );
}
