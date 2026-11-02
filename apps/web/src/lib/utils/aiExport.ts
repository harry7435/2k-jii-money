import type {
  Budget,
  Category,
  MonthlyNote,
  PaymentSource,
  Transaction,
} from "@2k-jii-money/supabase-types";
import { formatCurrency, formatYearMonth } from "./formatters";
import { findMiddleCategory, getCategoryPath } from "./categoryUtils";
import { EVALUATION_LABELS } from "../constants/categories";

export interface MonthSummary {
  income: number;
  expense: number;
  savings: number;
}

export interface AiExportInput {
  yearMonth: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  note: MonthlyNote | null;
  paymentSources: PaymentSource[];
  prevSummary: MonthSummary | undefined;
  includeTransactions: boolean;
}

const TYPE_LABELS: Record<Transaction["type"], string> = {
  income: "수입",
  expense: "지출",
  savings: "저축",
};

function sum(list: Transaction[]): number {
  return list.reduce((s, t) => s + t.amount, 0);
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${formatCurrency(n)}`;
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "-";
}

function cell(text: string | null | undefined): string {
  return (text ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function table(header: string[], rows: string[][]): string {
  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

/** 월 가계부를 AI 리포트용 Markdown으로 만든다. 멤버 정보는 포함하지 않는다. */
export function buildAiExport(input: AiExportInput): string {
  const {
    yearMonth,
    transactions,
    categories,
    budgets,
    note,
    paymentSources,
    prevSummary,
    includeTransactions,
  } = input;
  const label = formatYearMonth(yearMonth);
  const out: string[] = [];

  out.push(
    `아래는 우리 가족의 ${label} 가계부입니다. 다음 항목으로 리포트를 작성해 주세요.`,
    "",
    "1. 총평",
    "2. 지출 분석",
    "3. 예산 점검",
    "4. 낭비 지출",
    "5. 다음 달 제안",
    "",
    "금액 단위는 원(KRW)입니다. 저축 금액이 음수이면 저축 인출(저축에서 돈을 뺀 것)입니다.",
  );

  const income = sum(transactions.filter((t) => t.type === "income"));
  const expenses = transactions.filter((t) => t.type === "expense");
  const expense = sum(expenses);
  const savings = sum(transactions.filter((t) => t.type === "savings"));

  out.push("", "## 월 요약", "");
  if (transactions.length === 0) {
    out.push("이 달은 거래 없음 (기록된 거래가 없습니다).");
  } else {
    out.push(
      `- 수입: ${formatCurrency(income)}`,
      `- 지출: ${formatCurrency(expense)}`,
      `- 저축(순액): ${formatCurrency(savings)}`,
      `- 거래 건수: ${transactions.length}건`,
    );
    if (prevSummary) {
      out.push(
        "",
        "전월 대비",
        `- 수입: ${signed(income - prevSummary.income)} (전월 ${formatCurrency(prevSummary.income)})`,
        `- 지출: ${signed(expense - prevSummary.expense)} (전월 ${formatCurrency(prevSummary.expense)})`,
        `- 저축: ${signed(savings - prevSummary.savings)} (전월 ${formatCurrency(prevSummary.savings)})`,
      );
    }
  }

  // 지출 by 중분류 / 소분류
  const totalBudgetRow = budgets.find((b) => b.category_id === null);
  const budgetByCat = new Map(
    budgets.filter((b) => b.category_id).map((b) => [b.category_id!, b.amount]),
  );
  out.push("", "## 지출 (중분류 / 소분류)", "");
  if (totalBudgetRow) {
    out.push(
      `- 전체 예산: ${formatCurrency(totalBudgetRow.amount)}, 지출 ${formatCurrency(expense)}, 달성률 ${pct(expense, totalBudgetRow.amount)}`,
      "",
    );
  }
  if (expenses.length === 0) {
    out.push("지출 거래 없음");
  } else {
    const byMiddle = new Map<
      string,
      { name: string; total: number; subs: Map<string, { name: string; total: number }> }
    >();
    for (const t of expenses) {
      const mid = findMiddleCategory(t.category_id, categories);
      const key = mid?.id ?? "unknown";
      const g =
        byMiddle.get(key) ??
        { name: mid?.name ?? "(분류 없음)", total: 0, subs: new Map() };
      g.total += t.amount;
      const sub = categories.find((c) => c.id === t.category_id);
      const subKey = sub && sub.level === 3 ? sub.id : "_self";
      const subName = sub && sub.level === 3 ? sub.name : "(중분류 직접)";
      const s = g.subs.get(subKey) ?? { name: subName, total: 0 };
      s.total += t.amount;
      g.subs.set(subKey, s);
      byMiddle.set(key, g);
    }
    const hasBudget = [...byMiddle.keys()].some((k) => budgetByCat.has(k));
    const header = hasBudget
      ? ["중분류", "금액", "비중", "예산", "달성률"]
      : ["중분류", "금액", "비중"];
    const rows = [...byMiddle.entries()]
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([key, g]) => {
        const row = [cell(g.name), formatCurrency(g.total), pct(g.total, expense)];
        if (hasBudget) {
          const b = budgetByCat.get(key);
          row.push(
            b !== undefined ? formatCurrency(b) : "-",
            b !== undefined ? pct(g.total, b) : "-",
          );
        }
        return row;
      });
    out.push(table(header, rows));
    for (const [, g] of [...byMiddle.entries()].sort(
      ([, a], [, b]) => b.total - a.total,
    )) {
      out.push(
        "",
        `### ${cell(g.name)} 소분류`,
        "",
        table(
          ["소분류", "금액", "중분류 내 비중"],
          [...g.subs.values()]
            .sort((a, b) => b.total - a.total)
            .map((s) => [cell(s.name), formatCurrency(s.total), pct(s.total, g.total)]),
        ),
      );
    }
  }

  // 고정 vs 변동, 평가
  out.push("", "## 고정지출 vs 변동지출", "");
  if (expense === 0) {
    out.push("지출 거래 없음");
  } else {
    const isFixed = (t: Transaction) =>
      !!findMiddleCategory(t.category_id, categories)?.is_fixed;
    const fixed = sum(expenses.filter(isFixed));
    const variableList = expenses.filter((t) => !isFixed(t));
    const variable = sum(variableList);
    out.push(
      table(
        ["구분", "금액", "비중"],
        [
          ["고정지출", formatCurrency(fixed), pct(fixed, expense)],
          ["변동지출", formatCurrency(variable), pct(variable, expense)],
        ],
      ),
      "",
      "### 변동지출 평가 (소비/낭비/투자)",
      "",
    );
    const evalRows = (["consumption", "waste", "investment"] as const).map(
      (k) => {
        const amt = sum(variableList.filter((t) => t.evaluation === k));
        return [EVALUATION_LABELS[k], formatCurrency(amt), pct(amt, variable)];
      },
    );
    out.push(table(["평가", "금액", "비중"], evalRows));
    const unrated = variableList.filter((t) => !t.evaluation);
    if (unrated.length > 0) {
      out.push(
        "",
        `미평가: ${unrated.length}건 (${formatCurrency(sum(unrated))})`,
      );
    }
  }

  if (note && note.content.trim()) {
    out.push("", "## 이 달의 메모", "", note.content.trim());
  }

  if (includeTransactions) {
    out.push("", "## 거래 내역", "");
    if (transactions.length === 0) {
      out.push("거래 없음");
    } else {
      const srcMap = new Map(paymentSources.map((p) => [p.id, p.name]));
      const sorted = [...transactions].sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : (a.time ?? "").localeCompare(b.time ?? ""),
      );
      out.push(
        table(
          ["날짜", "시간", "유형", "카테고리", "금액", "결제수단", "평가", "메모"],
          sorted.map((t) => [
            t.date,
            t.time ?? "",
            TYPE_LABELS[t.type],
            cell(
              getCategoryPath(t.category_id, categories)
                .map((c) => c.name)
                .join(" > "),
            ),
            formatCurrency(t.amount),
            cell(t.payment_source_id ? srcMap.get(t.payment_source_id) : ""),
            t.evaluation ? EVALUATION_LABELS[t.evaluation] : "",
            cell(t.memo),
          ]),
        ),
      );
    }
  }

  return out.join("\n") + "\n";
}
