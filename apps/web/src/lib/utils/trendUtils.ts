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

export interface MiddleCategorySummary extends CategorySeries {
  total: number;
}

export interface MonthlyByCategoryResult {
  data: Array<Record<string, string | number>>;
  series: CategorySeries[];
}

/**
 * 모든 중분류 카테고리의 12개월 누적 지출 합을 내림차순으로 반환.
 * 카테고리 선택 UI에서 사용. 거래가 0건인 카테고리는 포함하지 않음.
 */
export function summarizeMiddleCategories(
  transactions: Transaction[],
  categories: Category[],
): MiddleCategorySummary[] {
  const totals = new Map<string, number>();
  const meta = new Map<string, { name: string; color: string }>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const middle = findMiddleCategory(t.category_id, categories);
    if (!middle) continue;
    totals.set(middle.id, (totals.get(middle.id) ?? 0) + t.amount);
    if (!meta.has(middle.id)) {
      meta.set(middle.id, { name: middle.name, color: middle.color });
    }
  }

  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([id, total]) => ({
      id,
      name: meta.get(id)!.name,
      color: meta.get(id)!.color,
      total,
    }));
}

/**
 * 선택된 중분류 카테고리들의 월별 지출 추이.
 * series 순서는 selectedIds의 12개월 누적 합 내림차순.
 * 각 row는 { month, [categoryId1]: number, ... } 형태.
 */
export function aggregateMonthlyBySelectedCategories(
  transactions: Transaction[],
  categories: Category[],
  monthList: string[],
  selectedIds: string[],
): MonthlyByCategoryResult {
  const summary = summarizeMiddleCategories(transactions, categories);
  // summary는 누적 합 내림차순. selectedIds에 포함된 것만 필터링하면 정렬도 유지됨.
  const inputSet = new Set(selectedIds);
  const series: CategorySeries[] = summary
    .filter((s) => inputSet.has(s.id))
    .map(({ id, name, color }) => ({ id, name, color }));

  const selectedSet = new Set(series.map((s) => s.id));

  const monthMap = new Map<string, Record<string, number>>();
  for (const m of monthList) monthMap.set(m, {});

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const middle = findMiddleCategory(t.category_id, categories);
    if (!middle || !selectedSet.has(middle.id)) continue;
    const row = monthMap.get(txYearMonth(t));
    if (!row) continue;
    row[middle.id] = (row[middle.id] ?? 0) + t.amount;
  }

  const data = monthList.map((m) => {
    const row: Record<string, string | number> = { month: m };
    const counts = monthMap.get(m) ?? {};
    for (const s of series) {
      row[s.id] = counts[s.id] ?? 0;
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
