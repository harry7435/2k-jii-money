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
import type { MonthlyByCategoryResult } from "@/src/lib/utils/trendUtils";

interface Props {
  result: MonthlyByCategoryResult;
}

export function MonthlyByCategoryChart({ result }: Props) {
  const { data, series } = result;
  if (series.length === 0 || data.length < 2) return null;

  const chartData = data.map((row) => ({
    ...row,
    monthLabel: String(row.month).slice(5) + "월",
  }));

  const maxValue = Math.max(
    0,
    ...data.flatMap((row) => series.map((s) => Number(row[s.id] ?? 0))),
  );

  const formatYAxis = (v: number) => {
    if (maxValue >= 10000) return `${(v / 10000).toFixed(0)}만`;
    if (maxValue >= 1000) return `${(v / 1000).toFixed(0)}천`;
    return v.toLocaleString("ko-KR");
  };

  // 차트 dataKey는 카테고리 ID지만 범례/Tooltip에는 이름 노출
  const nameById = Object.fromEntries(series.map((s) => [s.id, s.name]));

  return (
    <div className="bg-white rounded-2xl p-4">
      <h3 className="font-bold text-sm mb-3">중분류별 지출 추이</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 4, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={formatYAxis} />
          <Tooltip
            formatter={(v, key) => [
              formatCurrency(v as number),
              nameById[key as string] ?? key,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            formatter={(value) => nameById[value] ?? value}
          />
          {series.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.id}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
