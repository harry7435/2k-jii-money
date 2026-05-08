import { format } from "date-fns";
import type { Category, Transaction } from "@2k-jii-money/supabase-types";
import { findMiddleCategory } from "./categoryUtils";

export type EvaluationKey = "consumption" | "waste" | "investment";

/**
 * 오늘로부터 거슬러 올라가 N개월의 yearMonth 배열을 오름차순으로 반환.
 * 가장 오래된 달이 첫 번째, 현재 달이 마지막.
 */
export function buildMonthList(
  months: number,
  reference: Date = new Date(),
): string[] {
  const list: string[] = [];
  const baseY = reference.getFullYear();
  const baseM = reference.getMonth();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(baseY, baseM - i, 1);
    list.push(format(d, "yyyy-MM"));
  }
  return list;
}

function txYearMonth(t: Transaction): string {
  return t.date.slice(0, 7);
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
  savings: number;
}

/** 월별 type(수입/지출/저축) 합계 추이. 빈 달은 0으로 채움. */
export function aggregateMonthlyTotals(
  transactions: Transaction[],
  monthList: string[],
): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  for (const m of monthList) {
    map.set(m, { month: m, income: 0, expense: 0, savings: 0 });
  }
  for (const t of transactions) {
    const ym = txYearMonth(t);
    const entry = map.get(ym);
    if (!entry) continue;
    if (t.type === "income") entry.income += t.amount;
    else if (t.type === "savings") entry.savings += t.amount;
    else if (t.type === "expense") entry.expense += t.amount;
  }
  return monthList.map((m) => map.get(m)!);
}

export interface CategorySeries {
  id: string;
  name: string;
  color: string;
}

export interface MonthlyByCategoryResult {
  data: Array<Record<string, string | number>>;
  series: CategorySeries[];
}

/**
 * 월별 중분류 카테고리별 지출 추이. 12개월 누적 합 기준 상위 topN만 series로 반환.
 * 각 row는 { month, [categoryId1]: number, [categoryId2]: number, ... } 형태.
 * 차트 dataKey 충돌 방지를 위해 카테고리 ID를 key로 사용하고 series.name은 표시용.
 */
export function aggregateMonthlyByMiddleCategory(
  transactions: Transaction[],
  categories: Category[],
  monthList: string[],
  topN: number = 5,
): MonthlyByCategoryResult {
  const totals = new Map<string, number>();
  const meta = new Map<string, { name: string; color: string }>();
  const expenseTxs = transactions.filter((t) => t.type === "expense");

  for (const t of expenseTxs) {
    const middle = findMiddleCategory(t.category_id, categories);
    if (!middle) continue;
    totals.set(middle.id, (totals.get(middle.id) ?? 0) + t.amount);
    if (!meta.has(middle.id)) {
      meta.set(middle.id, { name: middle.name, color: middle.color });
    }
  }

  const topIds = [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([id]) => id);

  const series: CategorySeries[] = topIds.map((id) => ({
    id,
    name: meta.get(id)!.name,
    color: meta.get(id)!.color,
  }));
  const topSet = new Set(topIds);

  const monthMap = new Map<string, Record<string, number>>();
  for (const m of monthList) monthMap.set(m, {});

  for (const t of expenseTxs) {
    const middle = findMiddleCategory(t.category_id, categories);
    if (!middle || !topSet.has(middle.id)) continue;
    const ym = txYearMonth(t);
    const row = monthMap.get(ym);
    if (!row) continue;
    row[middle.id] = (row[middle.id] ?? 0) + t.amount;
  }

  const data = monthList.map((m) => {
    const row: Record<string, string | number> = { month: m };
    const counts = monthMap.get(m) ?? {};
    for (const id of topIds) {
      row[id] = counts[id] ?? 0;
    }
    return row;
  });

  return { data, series };
}

export interface MonthlyEvaluation {
  month: string;
  consumption: number;
  waste: number;
  investment: number;
}

/**
 * 월별 지출 평가(consumption/waste/investment) 추이. 변동지출만 대상.
 * evaluation null은 'consumption'으로 폴백.
 */
export function aggregateMonthlyEvaluation(
  transactions: Transaction[],
  categories: Category[],
  monthList: string[],
): MonthlyEvaluation[] {
  const map = new Map<string, MonthlyEvaluation>();
  for (const m of monthList) {
    map.set(m, { month: m, consumption: 0, waste: 0, investment: 0 });
  }
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const middle = findMiddleCategory(t.category_id, categories);
    if (!middle || middle.is_fixed) continue;
    const entry = map.get(txYearMonth(t));
    if (!entry) continue;
    const key = (t.evaluation ?? "consumption") as EvaluationKey;
    entry[key] += t.amount;
  }
  return monthList.map((m) => map.get(m)!);
}
