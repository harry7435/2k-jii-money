"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimeFormat } from "@/src/lib/utils/formatters";

interface UIPrefsStore {
  /** 거래 시간 표시 형식. 기본 24시 */
  timeFormat: TimeFormat;
  toggleTimeFormat: () => void;
}

export const useUIPrefsStore = create<UIPrefsStore>()(
  persist(
    (set) => ({
      timeFormat: "24h",
      toggleTimeFormat: () =>
        set((s) => ({ timeFormat: s.timeFormat === "24h" ? "12h" : "24h" })),
    }),
    { name: "jii-money-ui-prefs" },
  ),
);
