import type {
  EvaluationType,
  TransactionType,
} from "@2k-jii-money/supabase-types";

/**
 * 가입 직후 "샘플 데이터로 시작하기"를 선택했을 때 넣을 가상 데이터를 만든다.
 *
 * 순수 함수만 둔다 — DB·DOM 의존이 없어야 단위 테스트로 덮을 수 있다.
 * 실제 삽입은 queries.ts 의 seedSampleData 가 담당한다.
 *
 * 카테고리는 id가 아니라 이름 경로(path)로 지정한다. 샘플을 만드는 시점에는
 * 방금 생성된 기본 카테고리의 id를 알 수 없기 때문이다.
 * `미용실`처럼 서로 다른 중분류 아래에 같은 이름이 있으므로 경로 전체로 지정해야 한다.
 */

/** 카테고리 이름 경로. 지출은 [중분류, 소분류], 수입·저축은 [중분류]. */
export type CategoryPath = string[];

export interface SampleTransaction {
  path: CategoryPath;
  type: TransactionType;
  amount: number;
  memo: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm 또는 null */
  time: string | null;
  evaluation: EvaluationType | null;
}

export interface SampleBudget {
  /** null이면 전체 예산 */
  path: CategoryPath | null;
  /** yyyy-MM */
  yearMonth: string;
  amount: number;
}

export interface SampleSnapshot {
  accountName: string;
  /** yyyy-MM */
  yearMonth: string;
  amount: number;
}

export interface SampleData {
  transactions: SampleTransaction[];
  budgets: SampleBudget[];
  snapshots: SampleSnapshot[];
}

/** 샘플 데이터가 덮는 개월 수 (당월 포함). */
export const SAMPLE_MONTHS = 3;

/**
 * 시드 기반 난수. Math.random 대신 쓰는 이유는 테스트에서 결과가 흔들리지 않게 하려는 것.
 * mulberry32 — 짧고 분포가 고르다.
 */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYearMonth(year: number, month1: number): string {
  return `${year}-${pad2(month1)}`;
}

function toDate(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

/** 정수 [min, max] 구간에서 하나 고르되, unit 단위로 반올림한다. */
function pickAmount(
  rand: () => number,
  min: number,
  max: number,
  unit: number,
): number {
  const raw = min + rand() * (max - min);
  return Math.max(unit, Math.round(raw / unit) * unit);
}

function pickOne<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

interface ExpensePattern {
  path: CategoryPath;
  memos: readonly string[];
  min: number;
  max: number;
  /** 한 달에 몇 번쯤 발생하는가 */
  perMonth: number;
  evaluation: EvaluationType;
}

/**
 * 실제 소비 패턴이 아니라 "그럴듯해 보이는" 가상 값이다.
 * 대시보드 파이차트가 한쪽으로 쏠리지 않도록 중분류를 고르게 섞었다.
 */
const EXPENSE_PATTERNS: readonly ExpensePattern[] = [
  {
    path: ["식비", "식재료"],
    memos: ["장보기", "마트", "정육점", "채소"],
    min: 18000,
    max: 72000,
    perMonth: 5,
    evaluation: "consumption",
  },
  {
    path: ["식비", "함께 외식"],
    memos: ["주말 외식", "국밥", "파스타", "치킨"],
    min: 22000,
    max: 68000,
    perMonth: 4,
    evaluation: "consumption",
  },
  {
    path: ["식비", "함께 카페"],
    memos: ["카페", "디저트"],
    min: 6000,
    max: 18000,
    perMonth: 3,
    evaluation: "waste",
  },
  {
    path: ["식비", "간식"],
    memos: ["편의점", "빵집"],
    min: 3000,
    max: 14000,
    perMonth: 3,
    evaluation: "waste",
  },
  {
    path: ["생활", "생필품"],
    memos: ["세제", "휴지", "주방용품"],
    min: 8000,
    max: 45000,
    perMonth: 2,
    evaluation: "consumption",
  },
  {
    path: ["교통", "대중교통"],
    memos: ["교통카드 충전", "버스/지하철"],
    min: 20000,
    max: 60000,
    perMonth: 2,
    evaluation: "consumption",
  },
  {
    path: ["교통", "택시"],
    memos: ["택시"],
    min: 7000,
    max: 22000,
    perMonth: 1,
    evaluation: "waste",
  },
  {
    path: ["주거", "관리비"],
    memos: ["아파트 관리비"],
    min: 160000,
    max: 240000,
    perMonth: 1,
    evaluation: "consumption",
  },
  {
    path: ["통신", "휴대폰"],
    memos: ["휴대폰 요금"],
    min: 55000,
    max: 90000,
    perMonth: 1,
    evaluation: "consumption",
  },
  {
    path: ["건강", "운동"],
    memos: ["헬스장", "필라테스"],
    min: 50000,
    max: 130000,
    perMonth: 1,
    evaluation: "investment",
  },
  {
    path: ["건강", "병원"],
    memos: ["병원 진료", "치과"],
    min: 8000,
    max: 60000,
    perMonth: 1,
    evaluation: "consumption",
  },
  {
    path: ["문화여가", "영화관람"],
    memos: ["영화"],
    min: 14000,
    max: 34000,
    perMonth: 1,
    evaluation: "waste",
  },
  {
    path: ["문화여가", "도서"],
    memos: ["책"],
    min: 12000,
    max: 40000,
    perMonth: 1,
    evaluation: "investment",
  },
  {
    path: ["자동차", "주유"],
    memos: ["주유"],
    min: 50000,
    max: 90000,
    perMonth: 2,
    evaluation: "consumption",
  },
  {
    path: ["꾸밈", "의류"],
    memos: ["옷", "신발"],
    min: 25000,
    max: 120000,
    perMonth: 1,
    evaluation: "waste",
  },
];

const INCOME_PATTERNS: readonly {
  path: CategoryPath;
  memo: string;
  min: number;
  max: number;
  day: number;
}[] = [
  { path: ["익준급여"], memo: "월급", min: 3150000, max: 3250000, day: 25 },
  { path: ["현지급여"], memo: "월급", min: 2700000, max: 2800000, day: 25 },
];

const SAVINGS_PATTERNS: readonly {
  path: CategoryPath;
  memo: string;
  amount: number;
  day: number;
}[] = [
  { path: ["주택청약"], memo: "청약 납입", amount: 100000, day: 26 },
  { path: ["적금"], memo: "정기적금", amount: 500000, day: 26 },
  { path: ["투자"], memo: "적립식 투자", amount: 300000, day: 26 },
];

const BUDGET_PLAN: readonly { path: CategoryPath | null; amount: number }[] = [
  { path: null, amount: 2600000 },
  { path: ["식비"], amount: 750000 },
  { path: ["생활"], amount: 200000 },
  { path: ["교통"], amount: 150000 },
  { path: ["주거"], amount: 300000 },
  { path: ["통신"], amount: 150000 },
  { path: ["건강"], amount: 200000 },
  { path: ["문화여가"], amount: 150000 },
  { path: ["자동차"], amount: 250000 },
  { path: ["꾸밈"], amount: 150000 },
];

/** 자산 스냅샷을 만들 계좌와 시작 잔고. DEFAULT_ASSET_ACCOUNTS 의 이름과 맞춰야 한다. */
const SNAPSHOT_PLAN: readonly { accountName: string; base: number }[] = [
  { accountName: "현금", base: 350000 },
  { accountName: "우리은행", base: 8200000 },
  { accountName: "카카오뱅크", base: 3100000 },
  { accountName: "주택청약", base: 4600000 },
  { accountName: "ISA", base: 5400000 },
];

/** today 기준으로 과거 SAMPLE_MONTHS 개월의 (year, month) 목록을 오래된 순으로 만든다. */
export function sampleMonths(today: Date): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = SAMPLE_MONTHS - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

/**
 * 샘플 데이터 전체를 만든다.
 *
 * 당월은 아직 지나지 않은 날짜에 거래를 넣지 않는다 — 미래 날짜 거래가 섞이면
 * 일별 추이 그래프가 이상하게 보이고, 사용자가 직접 넣은 것과 구분도 안 된다.
 */
export function buildSampleData(
  today: Date,
  rand: () => number = createRandom(20260805),
): SampleData {
  const months = sampleMonths(today);
  const transactions: SampleTransaction[] = [];
  const budgets: SampleBudget[] = [];
  const snapshots: SampleSnapshot[] = [];

  months.forEach(({ year, month }, monthIndex) => {
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth() + 1;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth(year, month);
    const yearMonth = toYearMonth(year, month);

    for (const p of INCOME_PATTERNS) {
      if (p.day > lastDay) continue;
      transactions.push({
        path: p.path,
        type: "income",
        amount: pickAmount(rand, p.min, p.max, 10000),
        memo: p.memo,
        date: toDate(year, month, p.day),
        time: "09:00",
        evaluation: null,
      });
    }

    for (const p of SAVINGS_PATTERNS) {
      if (p.day > lastDay) continue;
      transactions.push({
        path: p.path,
        type: "savings",
        amount: p.amount,
        memo: p.memo,
        date: toDate(year, month, p.day),
        time: "09:30",
        evaluation: null,
      });
    }

    for (const p of EXPENSE_PATTERNS) {
      for (let i = 0; i < p.perMonth; i++) {
        const day = 1 + Math.floor(rand() * lastDay);
        if (day > lastDay) continue;
        transactions.push({
          path: p.path,
          type: "expense",
          amount: pickAmount(rand, p.min, p.max, 100),
          memo: pickOne(rand, p.memos),
          date: toDate(year, month, day),
          time: `${pad2(8 + Math.floor(rand() * 13))}:${pickOne(rand, ["00", "15", "30", "45"])}`,
          evaluation: p.evaluation,
        });
      }
    }

    for (const b of BUDGET_PLAN) {
      budgets.push({ path: b.path, yearMonth, amount: b.amount });
    }

    // 월이 지날수록 자산이 조금씩 늘어나는 모양을 만든다.
    for (const s of SNAPSHOT_PLAN) {
      const growth = 1 + monthIndex * 0.025;
      snapshots.push({
        accountName: s.accountName,
        yearMonth,
        amount: Math.round((s.base * growth) / 1000) * 1000,
      });
    }
  });

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return { transactions, budgets, snapshots };
}
