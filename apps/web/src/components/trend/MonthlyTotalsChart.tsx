"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/src/lib/utils/formatters";
import type { MonthlyTotal } from "@/src/lib/utils/trendUtils";

interface Props {
  data: MonthlyTotal[];
}

export function MonthlyTotalsChart({ data }: Props) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    ...d,
    monthLabel: d.month.slice(5) + "월",
  }));

  const maxValue = Math.max(
    ...chartData.flatMap((d) => [d.income, d.expense, d.savings]),
  );

  const formatYAxis = (v: number) => {
    if (maxValue >= 10000) return `${(v / 10000).toFixed(0)}만`;
    if (maxValue >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">월별 수입·지출·저축 추이</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxis} />
          <Tooltip formatter={(v) => [formatCurrency(v as number)]} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
          <Line
            type="monotone"
            dataKey="income"
            name="수입"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="savings"
            name="저축"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="지출"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
