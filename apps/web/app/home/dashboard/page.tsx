"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useFamilyStore } from "@/src/lib/store/familyStore";
import {
  getTransactions,
  getCategories,
  getMonthlySummary,
} from "@/src/lib/supabase/queries";
import {
  getCurrentYearMonth,
  formatCurrency,
  formatYearMonth,
} from "@/src/lib/utils/formatters";
import { findMiddleCategory } from "@/src/lib/utils/categoryUtils";
import { MonthSelector } from "@/src/components/MonthSelector";
import { SummarySection } from "@/src/components/dashboard/SummarySection";
import { ExpenseByMiddleCategory } from "@/src/components/dashboard/ExpenseByMiddleCategory";
import { FixedVsVariableExpense } from "@/src/components/dashboard/FixedVsVariableExpense";
import { EvaluationReport } from "@/src/components/dashboard/EvaluationReport";

export default function DashboardPage() {
  const { family } = useFamilyStore();
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const familyId = family?.id ?? "";

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", familyId, yearMonth],
    queryFn: () => getTransactions(familyId, yearMonth),
    enabled: !!familyId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", familyId],
    queryFn: () => getCategories(familyId),
    enabled: !!familyId,
  });

  const { data: summary } = useQuery({
    queryKey: ["summary", familyId, yearMonth],
    queryFn: () => getMonthlySummary(familyId, yearMonth),
    enabled: !!familyId,
  });

  // 중분류별 지출 (파이 차트)
  const expensesByMiddle = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, { name: string; value: number; color: string }>>(
      (acc, t) => {
        const middle = findMiddleCategory(t.category_id, categories);
        if (!middle) return acc;
        acc[middle.id] = acc[middle.id] ?? {
          name: middle.name,
          value: 0,
          color: middle.color,
        };
        acc[middle.id].value += t.amount;
        return acc;
      },
      {},
    );

  const pieData = Object.values(expensesByMiddle)
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ ...d, fill: d.color }));

  // 일별 지출 (바 차트)
  const dailyExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      const day = parseInt(t.date.split("-")[2], 10);
      acc[day] = (acc[day] ?? 0) + t.amount;
      return acc;
    }, {});

  const barData = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    amount: dailyExpense[i + 1] ?? 0,
  })).filter((d) => d.amount > 0);

  return (
    <div className="flex flex-col h-full">
      <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 요약 카드 */}
        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-2xl p-3">
              <p className="text-xs text-blue-400 font-semibold">수입</p>
              <p className="text-sm font-bold text-blue-600 mt-1">
                {formatCurrency(summary.income)}
              </p>
            </div>
            <div className="bg-teal-50 rounded-2xl p-3">
              <p className="text-xs text-teal-400 font-semibold">저축</p>
              <p className="text-sm font-bold text-teal-600 mt-1">
                {formatCurrency(summary.savings)}
              </p>
            </div>
            <div className="bg-red-50 rounded-2xl p-3">
              <p className="text-xs text-red-400 font-semibold">지출</p>
              <p className="text-sm font-bold text-red-500 mt-1">
                {formatCurrency(summary.expense)}
              </p>
            </div>
          </div>
        )}

        {/* 수입 현황 */}
        <SummarySection
          transactions={transactions}
          categories={categories}
          type="income"
          title="수입 현황"
        />

        {/* 저축 현황 */}
        <SummarySection
          transactions={transactions}
          categories={categories}
          type="savings"
          title="저축 현황"
        />

        {/* 지출 현황 (중분류별) */}
        <ExpenseByMiddleCategory
          transactions={transactions}
          categories={categories}
        />

        {/* 파이 차트 */}
        {pieData.length > 0 ? (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">카테고리별 지출</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  label={({
                    name,
                    percent,
                    x,
                    y,
                    textAnchor,
                  }: {
                    name?: string;
                    percent?: number;
                    x?: number;
                    y?: number;
                    textAnchor?: "start" | "middle" | "end" | "inherit";
                  }) => (
                    <text
                      x={x}
                      y={y}
                      textAnchor={textAnchor}
                      dominantBaseline="central"
                      fontSize={11}
                      fill="#555"
                    >
                      {`${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    </text>
                  )}
                  labelLine={{ stroke: "#ccc", strokeWidth: 1 }}
                />
                <Tooltip formatter={(v) => [formatCurrency(v as number)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {pieData.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center h-36 text-gray-500 text-sm">
            <span className="material-symbols-outlined text-4xl mb-2">
              pie_chart
            </span>
            지출 데이터가 없습니다
          </div>
        )}

        {/* 고정지출 vs 변동지출 */}
        <FixedVsVariableExpense
          transactions={transactions}
          categories={categories}
        />

        {/* 변동지출 평가 */}
        <EvaluationReport transactions={transactions} categories={categories} />

        {/* 일별 바 차트 */}
        {barData.length > 0 && (
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">일별 지출 추이</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={barData}
                margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v}일`}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(v as number)]}
                  labelFormatter={(l) => `${l}일`}
                />
                <Bar dataKey="amount" fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 pb-2">
          {formatYearMonth(yearMonth)} 통계
        </p>
      </div>
    </div>
  );
}
