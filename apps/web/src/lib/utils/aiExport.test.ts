import { describe, it, expect } from "vitest";
import type {
  Budget,
  Category,
  MonthlyNote,
  PaymentSource,
  Transaction,
} from "@2k-jii-money/supabase-types";
import type { AssetAccount, AssetSnapshot } from "@2k-jii-money/supabase-types";
import { buildAiExport, buildAssetAiExport } from "./aiExport";

const cat = (o: Partial<Category>): Category => ({
  id: "c",
  family_id: "f",
  name: "x",
  icon: "i",
  color: "#000",
  is_default: false,
  level: 3,
  parent_id: null,
  is_fixed: false,
  ...o,
});

const categories: Category[] = [
  cat({ id: "L1-exp", name: "지출", level: 1 }),
  cat({ id: "L1-inc", name: "수입", level: 1 }),
  cat({ id: "L1-sav", name: "저축", level: 1 }),
  cat({ id: "M-food", name: "식비", level: 2, parent_id: "L1-exp" }),
  cat({ id: "M-rent", name: "월세", level: 2, parent_id: "L1-exp", is_fixed: true }),
  cat({ id: "S-groc", name: "식재료", level: 3, parent_id: "M-food" }),
  cat({ id: "S-out", name: "외식", level: 3, parent_id: "M-food" }),
  cat({ id: "M-sal", name: "급여", level: 2, parent_id: "L1-inc" }),
  cat({ id: "M-fund", name: "적금", level: 2, parent_id: "L1-sav" }),
];

const tx = (o: Partial<Transaction>): Transaction => ({
  id: "t",
  family_id: "f",
  member_id: "MEMBER-SECRET-ID",
  category_id: "S-groc",
  type: "expense",
  amount: 1000,
  memo: null,
  date: "2026-10-01",
  time: null,
  payment_source_id: null,
  evaluation: null,
  created_at: "2026-10-01T00:00:00Z",
  ...o,
});

const transactions: Transaction[] = [
  tx({ id: "1", category_id: "M-sal", type: "income", amount: 3000000, date: "2026-10-25" }),
  tx({ id: "2", category_id: "S-groc", amount: 50000, date: "2026-10-03", time: "10:00", evaluation: "consumption", payment_source_id: "ps1", memo: "마트 | 장보기\n두번째줄" }),
  tx({ id: "3", category_id: "S-out", amount: 30000, date: "2026-10-02", evaluation: "waste" }),
  tx({ id: "4", category_id: "M-rent", amount: 500000, date: "2026-10-01" }),
  tx({ id: "5", category_id: "M-fund", type: "savings", amount: 200000, date: "2026-10-26" }),
  tx({ id: "6", category_id: "M-fund", type: "savings", amount: -50000, date: "2026-10-27" }),
  tx({ id: "7", category_id: "M-food", amount: 20000, date: "2026-10-05" }), // 중분류 직접, 미평가
];

const sources: PaymentSource[] = [
  { id: "ps1", family_id: "f", name: "신한카드", is_default: false, sort_order: 0 },
];

const base = {
  yearMonth: "2026-10",
  transactions,
  categories,
  budgets: [] as Budget[],
  note: null as MonthlyNote | null,
  paymentSources: sources,
  prevSummary: undefined as { income: number; expense: number; savings: number } | undefined,
  includeTransactions: false,
};

const budget = (o: Partial<Budget>): Budget => ({
  id: "b",
  family_id: "f",
  category_id: null,
  year_month: "2026-10",
  amount: 0,
  created_at: "",
  ...o,
});

describe("buildAiExport", () => {
  it("프롬프트와 월 요약 합계를 포함한다", () => {
    const out = buildAiExport(base);
    expect(out).toContain("2026년 10월");
    expect(out).toContain("총평");
    expect(out).toContain("저축 인출");
    expect(out).toContain("3,000,000원");
    expect(out).toContain("600,000원"); // 지출
    expect(out).toContain("150,000원"); // 저축 순액 (200000-50000)
  });

  it("전월 요약이 있으면 전월 대비를 표시하고 없으면 생략한다", () => {
    const withPrev = buildAiExport({
      ...base,
      prevSummary: { income: 2000000, expense: 500000, savings: 100000 },
    });
    expect(withPrev).toContain("전월 대비");
    expect(withPrev).toContain("+1,000,000원");
    expect(buildAiExport(base)).not.toContain("전월 대비");
  });

  it("중분류 아래 소분류 지출을 표로 보여준다", () => {
    const out = buildAiExport(base);
    expect(out).toContain("식비");
    expect(out).toContain("식재료");
    expect(out).toContain("외식");
    expect(out).toContain("100,000원");
  });

  it("예산과 달성률(%)을 계산한다", () => {
    const out = buildAiExport({
      ...base,
      budgets: [
        budget({ category_id: null, amount: 1000000 }),
        budget({ category_id: "M-food", amount: 160000 }),
      ],
    });
    expect(out).toContain("1,000,000원");
    expect(out).toContain("60.0%"); // 600000/1000000
    expect(out).toContain("62.5%"); // 100000/160000
  });

  it("저축 음수(인출)를 그대로 표현한다", () => {
    const out = buildAiExport({ ...base, includeTransactions: true });
    expect(out).toContain("-50,000원");
  });

  it("고정/변동과 평가 비중, 미평가 건수를 포함한다", () => {
    const out = buildAiExport(base);
    expect(out).toContain("고정지출");
    expect(out).toContain("변동지출");
    expect(out).toContain("낭비");
    expect(out).toMatch(/미평가[^\n]*1건/);
  });

  it("빈 달에도 유효한 텍스트를 만든다", () => {
    const out = buildAiExport({ ...base, transactions: [], includeTransactions: true });
    expect(out).toContain("거래 없음");
    expect(out).toContain("2026년 10월");
  });

  it("includeTransactions 켜면 거래 표(날짜순)를 넣고 끄면 뺀다", () => {
    const on = buildAiExport({ ...base, includeTransactions: true });
    expect(on).toContain("| 날짜 | 시간 | 유형 |");
    expect(on).toContain("지출 > 식비 > 식재료");
    expect(on).toContain("신한카드");
    expect(on.indexOf("2026-10-01")).toBeLessThan(on.indexOf("2026-10-03"));
    const off = buildAiExport(base);
    expect(off).not.toContain("| 날짜 | 시간 | 유형 |");
  });

  it("메모의 파이프와 줄바꿈을 이스케이프한다", () => {
    const out = buildAiExport({ ...base, includeTransactions: true });
    expect(out).toContain("마트 \\| 장보기 두번째줄");
  });

  it("월 메모는 내용이 있을 때만 넣는다", () => {
    const note = { id: "n", family_id: "f", year_month: "2026-10", content: "병원비 발생", created_at: "", updated_at: "" };
    expect(buildAiExport({ ...base, note })).toContain("병원비 발생");
    expect(buildAiExport({ ...base, note: { ...note, content: "  " } })).not.toContain("이 달의 메모");
  });

  it("멤버 정보는 절대 포함하지 않는다", () => {
    const out = buildAiExport({ ...base, includeTransactions: true });
    expect(out).not.toContain("MEMBER-SECRET-ID");
    expect(out).not.toContain("member_id");
  });
});

const acc = (o: Partial<AssetAccount>): AssetAccount => ({
  id: "a",
  family_id: "f",
  name: "x",
  account_type: "bank",
  sort_order: 0,
  created_at: "",
  ...o,
});
const snap = (o: Partial<AssetSnapshot>): AssetSnapshot => ({
  id: "s",
  family_id: "f",
  account_id: "a",
  year_month: "2026-10",
  amount: 0,
  created_at: "",
  updated_at: "",
  ...o,
});

const accounts: AssetAccount[] = [
  acc({ id: "a-bank2", name: "카카오뱅크", account_type: "bank", sort_order: 1 }),
  acc({ id: "a-bank1", name: "우리은행", account_type: "bank", sort_order: 0 }),
  acc({ id: "a-cash", name: "현금", account_type: "cash", sort_order: 0 }),
  acc({ id: "a-loan", name: "주택대출", account_type: "liability", sort_order: 0 }),
];

const assetBase = {
  yearMonth: "2026-10",
  accounts,
  snapshots: [
    snap({ account_id: "a-bank1", amount: 5000000 }),
    snap({ account_id: "a-cash", amount: 100000 }),
    snap({ account_id: "a-loan", amount: 2000000 }),
  ],
  prevSnapshots: [] as AssetSnapshot[],
  history: [
    snap({ account_id: "a-bank1", amount: 4000000, year_month: "2026-08" }),
    snap({ account_id: "a-loan", amount: 1000000, year_month: "2026-08" }),
    snap({ account_id: "a-bank1", amount: 5000000, year_month: "2026-10" }),
    snap({ account_id: "a-cash", amount: 100000, year_month: "2026-10" }),
    snap({ account_id: "a-loan", amount: 2000000, year_month: "2026-10" }),
  ],
  savingsTx: [
    tx({ type: "savings", amount: 200000, date: "2026-10-26" }),
    tx({ type: "savings", amount: -50000, date: "2026-10-27" }),
    tx({ type: "savings", amount: 300000, date: "2026-08-02" }),
    tx({ type: "expense", amount: 999, date: "2026-10-02" }),
  ],
  range: { from: "2026-08", to: "2026-10" },
};

describe("buildAssetAiExport", () => {
  it("프롬프트와 순자산(자산-부채)을 계산한다", () => {
    const out = buildAssetAiExport(assetBase);
    expect(out).toContain("2026년 10월 자산 현황");
    expect(out).toContain("저축 인출");
    expect(out).toContain("- 총자산: 5,100,000원");
    expect(out).toContain("- 부채: 2,000,000원");
    expect(out).toContain("- 순자산: 3,100,000원");
  });

  it("전월 스냅샷이 있으면 전월 대비를 표시하고 없으면 생략한다", () => {
    const withPrev = buildAssetAiExport({
      ...assetBase,
      prevSnapshots: [
        snap({ account_id: "a-bank1", amount: 4000000, year_month: "2026-09" }),
        snap({ account_id: "a-loan", amount: 2500000, year_month: "2026-09" }),
      ],
    });
    expect(withPrev).toContain("(전월 대비");
    expect(withPrev).toContain("+1,000,000원"); // 우리은행
    expect(withPrev).toContain("-500,000원"); // 부채
    expect(buildAssetAiExport(assetBase)).not.toContain("(전월 대비");
  });

  it("계좌를 유형별 sort_order 순으로 표시하고 스냅샷 없는 계좌는 기록 없음", () => {
    const out = buildAssetAiExport(assetBase).split("## 계좌별 잔액")[1];
    expect(out.indexOf("우리은행")).toBeLessThan(out.indexOf("카카오뱅크"));
    expect(out.indexOf("현금")).toBeLessThan(out.indexOf("우리은행"));
    expect(out).toMatch(/카카오뱅크 \| 기록 없음/);
  });

  it("잔액 기록이 없는 계좌를 요약에 표시 순서대로 나열한다", () => {
    const out = buildAssetAiExport({
      ...assetBase,
      snapshots: [snap({ account_id: "a-bank1", amount: 5000000 })],
    });
    expect(out).toContain(
      "- 이번 달 잔액 기록이 없는 계좌: 현금, 카카오뱅크, 주택대출 (합계에서 0원으로 계산됨)",
    );
  });

  it("모든 계좌에 기록이 있거나 계좌가 없으면 해당 줄을 넣지 않는다", () => {
    const all = buildAssetAiExport({
      ...assetBase,
      snapshots: [
        ...assetBase.snapshots,
        snap({ account_id: "a-bank2", amount: 1 }),
      ],
    });
    expect(all).not.toContain("잔액 기록이 없는 계좌");
    const none = buildAssetAiExport({ ...assetBase, accounts: [], snapshots: [] });
    expect(none).not.toContain("잔액 기록이 없는 계좌");
  });

  it("월별 추이에서 기록이 없는 달은 기록 없음", () => {
    const out = buildAssetAiExport(assetBase);
    expect(out).toMatch(/\| 2026-08 \| 4,000,000원 \| 1,000,000원 \| 3,000,000원 \|/);
    expect(out).toMatch(/\| 2026-09 \| 기록 없음/);
    expect(out).toMatch(/\| 2026-10 \| 5,100,000원 \| 2,000,000원 \| 3,100,000원 \|/);
  });

  it("월별 저축을 입금/인출/순액으로 나눈다", () => {
    const out = buildAssetAiExport(assetBase);
    expect(out).toMatch(/\| 2026-10 \| 200,000원 \| 50,000원 \| 150,000원 \|/);
    expect(out).toMatch(/\| 2026-08 \| 300,000원 \| 0원 \| 300,000원 \|/);
    expect(out).toMatch(/\| 2026-09 \| 0원 \| 0원 \| 0원 \|/);
  });

  it("계좌가 없어도 깨지지 않고 멤버 정보를 넣지 않는다", () => {
    const out = buildAssetAiExport({
      ...assetBase,
      accounts: [],
      snapshots: [],
      history: [],
      savingsTx: [],
    });
    expect(out).toContain("순자산: 0원");
    expect(out).toContain("등록된 계좌 없음");
    expect(out).not.toContain("MEMBER-SECRET-ID");
    expect(buildAssetAiExport(assetBase)).not.toContain("MEMBER-SECRET-ID");
  });
});
