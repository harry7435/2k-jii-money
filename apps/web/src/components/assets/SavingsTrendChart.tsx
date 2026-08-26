"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/src/lib/utils/formatters";
import type { MonthlySavings } from "@/src/lib/utils/trendUtils";

interface SavingsTrendChartProps {
  data: MonthlySavings[];
}

export function SavingsTrendChart({ data }: SavingsTrendChartProps) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    ...d,
    monthLabel: d.month.slice(5) + "월",
  }));

  const maxAbs = Math.max(...chartData.map((d) => Math.abs(d.amount)));

  const formatYAxis = (v: number) => {
    if (maxAbs >= 10000) return `${(v / 10000).toFixed(0)}만`;
    if (maxAbs >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">월별 저축 추이</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxis} />
          <Tooltip
            formatter={(v) => [formatCurrency(v as number), "저축"]}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <ReferenceLine y={0} stroke="#d1d5db" />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {chartData.map((d) => (
              // 저축 인출(음수)은 주황, 입금은 teal
              <Cell key={d.month} fill={d.amount < 0 ? "#f97316" : "#2dd4bf"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
