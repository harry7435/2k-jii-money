"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/src/lib/utils/formatters";
import { EVALUATION_LABELS } from "@/src/lib/constants/categories";
import type { MonthlyEvaluation } from "@/src/lib/utils/trendUtils";

interface Props {
  data: MonthlyEvaluation[];
}

export function MonthlyEvaluationChart({ data }: Props) {
  if (data.length < 2) return null;

  const total = data.reduce(
    (s, d) => s + d.consumption + d.waste + d.investment,
    0,
  );
  if (total === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    monthLabel: d.month.slice(5) + "월",
  }));

  const maxValue = Math.max(
    ...chartData.map((d) => d.consumption + d.waste + d.investment),
  );

  const formatYAxis = (v: number) => {
    if (maxValue >= 10000) return `${(v / 10000).toFixed(0)}만`;
    if (maxValue >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">변동지출 평가 추이</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxis} />
          <Tooltip
            formatter={(v, key) => [
              formatCurrency(v as number),
              EVALUATION_LABELS[key as string] ?? key,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            formatter={(value) => EVALUATION_LABELS[value] ?? value}
          />
          <Bar dataKey="consumption" stackId="a" fill="#10b981" />
          <Bar dataKey="waste" stackId="a" fill="#f59e0b" />
          <Bar dataKey="investment" stackId="a" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
