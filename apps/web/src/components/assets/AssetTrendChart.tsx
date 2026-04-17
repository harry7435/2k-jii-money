"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AssetAccount, AssetSnapshot } from "@2k-jii-money/supabase-types";
import { formatCurrency } from "@/src/lib/utils/formatters";

interface AssetTrendChartProps {
  snapshots: AssetSnapshot[];
  accounts: AssetAccount[];
}

export function AssetTrendChart({ snapshots, accounts }: AssetTrendChartProps) {
  const liabilityAccountIds = new Set(
    accounts.filter((a) => a.account_type === "liability").map((a) => a.id),
  );

  // 월별로 그룹핑하여 자산/부채/순자산 계산
  const monthMap = new Map<
    string,
    { assets: number; liabilities: number; net: number }
  >();

  for (const s of snapshots) {
    const entry = monthMap.get(s.year_month) ?? {
      assets: 0,
      liabilities: 0,
      net: 0,
    };
    if (liabilityAccountIds.has(s.account_id)) {
      entry.liabilities += s.amount;
    } else {
      entry.assets += s.amount;
    }
    entry.net = entry.assets - entry.liabilities;
    monthMap.set(s.year_month, entry);
  }

  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month: month.slice(5) + "월",
      순자산: data.net,
      자산: data.assets,
    }));

  if (chartData.length < 2) return null;

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.순자산, d.자산)),
  );

  const formatYAxis = (v: number) => {
    if (maxValue >= 10000) return `${(v / 10000).toFixed(0)}만`;
    if (maxValue >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">월별 자산 추이</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxis} />
          <Tooltip formatter={(v) => [formatCurrency(v as number)]} />
          <Line
            type="monotone"
            dataKey="순자산"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="자산"
            stroke="#93c5fd"
            strokeWidth={1.5}
            dot={{ r: 2 }}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
