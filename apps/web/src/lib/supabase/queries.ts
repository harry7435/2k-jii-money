import { createClient } from "./client";
import { v4 as uuidv4 } from "uuid";
import { monthDateRange } from "../utils/formatters";
import {
  DEFAULT_CATEGORY_TREE,
  DEFAULT_PAYMENT_SOURCES,
} from "../constants/categories";
import { DEFAULT_ASSET_ACCOUNTS } from "../constants/assets";
import type { CategoryNode } from "../constants/categories";
import type {
  Category,
  Transaction,
  Budget,
  Family,
  Member,
  PaymentSource,
  AssetAccount,
  AssetSnapshot,
  AssetAccountType,
} from "@2k-jii-money/supabase-types";

const FAMILY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateFamilyCode(): string {
  return Array.from(
    { length: 6 },
    () =>
      FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)],
  ).join("");
}

// ─── Family ────────────────────────────────────────────────────────────────

export async function createFamily(
  nickname: string,
): Promise<{ family: Family; member: Member }> {
  const supabase = createClient();
  const familyCode = generateFamilyCode();
  const familyId = uuidv4();
  const memberId = uuidv4();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family, error: fErr } = await (supabase as any)
    .from("families")
    .insert({ id: familyId, family_code: familyCode })
    .select()
    .single();
  if (fErr) throw fErr;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member, error: mErr } = await (supabase as any)
    .from("members")
    .insert({ id: memberId, family_id: familyId, nickname })
    .select()
    .single();
  if (mErr) throw mErr;

  await createDefaultCategories(familyId);
  await createDefaultPaymentSources(familyId);
  await createDefaultAssetAccounts(familyId);

  return { family: family as Family, member: member as Member };
}

export async function findFamilyByCode(code: string): Promise<Family | null> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("families")
    .select()
    .eq("family_code", code.toUpperCase())
    .single();
  return (data as Family) ?? null;
}

export async function joinFamily(
  familyId: string,
  nickname: string,
): Promise<Member> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("members")
    .insert({ id: uuidv4(), family_id: familyId, nickname })
    .select()
    .single();
  if (error) throw error;
  return data as Member;
}

export async function getMembers(familyId: string): Promise<Member[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("members")
    .select()
    .eq("family_id", familyId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Member[];
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function createDefaultCategories(familyId: string): Promise<void> {
  const supabase = createClient();

  // 재귀적으로 트리를 평탄화하여 레벨별로 삽입
  async function insertLevel(
    nodes: CategoryNode[],
    level: number,
    parentId: string | null,
  ): Promise<void> {
    const rows = nodes.map((c) => ({
      id: uuidv4(),
      family_id: familyId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      is_default: c.isDefault,
      level,
      parent_id: parentId,
      is_fixed: c.isFixed ?? false,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("categories")
      .insert(rows)
      .select("id, name");
    if (error) throw error;

    const inserted = data as { id: string; name: string }[];

    // 자식 카테고리 삽입
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].children?.length) {
        const parentRow = inserted.find((r) => r.name === nodes[i].name);
        if (parentRow) {
          await insertLevel(nodes[i].children!, level + 1, parentRow.id);
        }
      }
    }
  }

  await insertLevel(DEFAULT_CATEGORY_TREE, 1, null);
}

export async function getCategories(familyId: string): Promise<Category[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("categories")
    .select()
    .eq("family_id", familyId)
    .order("level")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function addCategory(
  familyId: string,
  name: string,
  icon: string,
  color: string,
  parentId?: string,
  level?: number,
): Promise<Category> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("categories")
    .insert({
      id: uuidv4(),
      family_id: familyId,
      name,
      icon,
      color,
      is_default: false,
      parent_id: parentId ?? null,
      level: level ?? 3,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

/** 기존 가족에 누락된 기본 카테고리를 추가 (멱등)
 *  - "parentId:name" 키로 존재 여부를 확인하여 없는 것만 삽입
 *  - 수입/저축처럼 중분류 없이 바로 소분류가 오는 구조도 처리
 */
export async function insertMissingSubCategories(
  familyId: string,
  existingCategories: Category[],
): Promise<number> {
  const supabase = createClient();
  let insertCount = 0;

  // 대분류 맵
  const majorByName = new Map(
    existingCategories.filter((c) => c.level === 1).map((c) => [c.name, c]),
  );

  // 기존 카테고리 인덱스: "parentId:name" → Category
  const existingByKey = new Map<string, Category>();
  for (const c of existingCategories) {
    existingByKey.set(`${c.parent_id ?? "root"}:${c.name}`, c);
  }

  // 재귀적으로 누락된 노드만 삽입
  async function ensureNode(
    node: CategoryNode,
    level: number,
    parentId: string,
  ): Promise<string> {
    const key = `${parentId}:${node.name}`;
    const existing = existingByKey.get(key);
    if (existing) return existing.id;

    const newId = uuidv4();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("categories").insert({
      id: newId,
      family_id: familyId,
      name: node.name,
      icon: node.icon,
      color: node.color,
      is_default: true,
      level,
      parent_id: parentId,
      is_fixed: node.isFixed ?? false,
    });
    if (error) throw error;
    insertCount++;
    existingByKey.set(key, {
      id: newId,
      name: node.name,
      level,
      parent_id: parentId,
    } as Category);
    return newId;
  }

  for (const major of DEFAULT_CATEGORY_TREE) {
    const existingMajor = majorByName.get(major.name);
    if (!existingMajor) continue;

    for (const child of major.children ?? []) {
      const childId = await ensureNode(child, 2, existingMajor.id);
      for (const sub of child.children ?? []) {
        await ensureNode(sub, 3, childId);
      }
    }
  }

  return insertCount;
}

export async function updateCategory(
  id: string,
  params: { name?: string; icon?: string; color?: string; is_fixed?: boolean },
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("categories")
    .update(params)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Payment Sources ──────────────────────────────────────────────────────

export async function createDefaultPaymentSources(
  familyId: string,
): Promise<void> {
  const supabase = createClient();
  const rows = DEFAULT_PAYMENT_SOURCES.map((ps, i) => ({
    id: uuidv4(),
    family_id: familyId,
    name: ps.name,
    is_default: ps.isDefault,
    sort_order: i,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("payment_sources")
    .insert(rows);
  if (error) throw error;
}

export async function getPaymentSources(
  familyId: string,
): Promise<PaymentSource[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_sources")
    .select()
    .eq("family_id", familyId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as PaymentSource[];
}

export async function addPaymentSource(
  familyId: string,
  name: string,
): Promise<PaymentSource> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("payment_sources")
    .insert({ id: uuidv4(), family_id: familyId, name, is_default: false })
    .select()
    .single();
  if (error) throw error;
  return data as PaymentSource;
}

export async function deletePaymentSource(id: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("payment_sources")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Transactions ──────────────────────────────────────────────────────────

export async function getTransactions(
  familyId: string,
  yearMonth: string,
): Promise<Transaction[]> {
  const supabase = createClient();
  const { from, to } = monthDateRange(yearMonth);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("transactions")
    .select()
    .eq("family_id", familyId)
    .gte("date", from)
    .lt("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function addTransaction(params: {
  familyId: string;
  memberId: string;
  categoryId: string;
  type: "income" | "expense" | "savings";
  amount: number;
  memo?: string;
  date: string;
  time?: string;
  paymentSourceId?: string;
  evaluation?: "consumption" | "waste" | "investment";
}): Promise<Transaction> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("transactions")
    .insert({
      id: uuidv4(),
      family_id: params.familyId,
      member_id: params.memberId,
      category_id: params.categoryId,
      type: params.type,
      amount: params.amount,
      memo: params.memo || null,
      date: params.date,
      time: params.time || null,
      payment_source_id: params.paymentSourceId || null,
      evaluation: params.evaluation || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(
  id: string,
  params: {
    categoryId: string;
    type: "income" | "expense" | "savings";
    amount: number;
    memo?: string;
    date: string;
    time?: string;
    paymentSourceId?: string;
    evaluation?: "consumption" | "waste" | "investment";
  },
): Promise<Transaction> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("transactions")
    .update({
      category_id: params.categoryId,
      type: params.type,
      amount: params.amount,
      memo: params.memo || null,
      date: params.date,
      time: params.time || null,
      payment_source_id: params.paymentSourceId || null,
      evaluation: params.evaluation || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("transactions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getMonthlySummary(
  familyId: string,
  yearMonth: string,
): Promise<{ income: number; expense: number; savings: number }> {
  const transactions = await getTransactions(familyId, yearMonth);
  return transactions.reduce(
    (acc, t) => {
      if (t.type === "income") acc.income += t.amount;
      else if (t.type === "savings") acc.savings += t.amount;
      else acc.expense += t.amount;
      return acc;
    },
    { income: 0, expense: 0, savings: 0 },
  );
}

// ─── Budgets ───────────────────────────────────────────────────────────────

export async function getBudgets(
  familyId: string,
  yearMonth: string,
): Promise<Budget[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("budgets")
    .select()
    .eq("family_id", familyId)
    .eq("year_month", yearMonth);
  if (error) throw error;
  return (data ?? []) as Budget[];
}

export async function setBudget(
  familyId: string,
  categoryId: string | null,
  yearMonth: string,
  amount: number,
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("budgets")
    .select("id")
    .eq("family_id", familyId)
    .eq("year_month", yearMonth);

  query = categoryId
    ? query.eq("category_id", categoryId)
    : query.is("category_id", null);

  const { data: existing } = await query.single();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("budgets")
      .update({ amount })
      .eq("id", (existing as { id: string }).id);
    if (error) throw error;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("budgets").insert({
      id: uuidv4(),
      family_id: familyId,
      category_id: categoryId,
      year_month: yearMonth,
      amount,
    });
    if (error) throw error;
  }
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("budgets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ─── Asset Accounts & Snapshots ───────────────────────────────────────────

export async function createDefaultAssetAccounts(
  familyId: string,
): Promise<void> {
  const supabase = createClient();
  const rows = DEFAULT_ASSET_ACCOUNTS.map((a, i) => ({
    id: uuidv4(),
    family_id: familyId,
    name: a.name,
    account_type: a.account_type,
    sort_order: i,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("asset_accounts").insert(rows);
  if (error) throw error;
}

export async function getAssetAccounts(
  familyId: string,
): Promise<AssetAccount[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_accounts")
    .select()
    .eq("family_id", familyId)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as AssetAccount[];
}

export async function addAssetAccount(
  familyId: string,
  name: string,
  accountType: AssetAccountType,
): Promise<AssetAccount> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_accounts")
    .insert({
      id: uuidv4(),
      family_id: familyId,
      name,
      account_type: accountType,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AssetAccount;
}

export async function updateAssetAccount(
  id: string,
  params: { name?: string },
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("asset_accounts")
    .update(params)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAssetAccount(id: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("asset_accounts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getAssetSnapshots(
  familyId: string,
  yearMonth: string,
): Promise<AssetSnapshot[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_snapshots")
    .select()
    .eq("family_id", familyId)
    .eq("year_month", yearMonth);
  if (error) throw error;
  return (data ?? []) as AssetSnapshot[];
}

export async function upsertAssetSnapshot(
  familyId: string,
  accountId: string,
  yearMonth: string,
  amount: number,
): Promise<AssetSnapshot> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_snapshots")
    .upsert(
      {
        id: uuidv4(),
        family_id: familyId,
        account_id: accountId,
        year_month: yearMonth,
        amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id,year_month" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as AssetSnapshot;
}

export async function getAssetSnapshotHistory(
  familyId: string,
  months: number,
): Promise<AssetSnapshot[]> {
  const supabase = createClient();
  // 최근 N개월의 year_month 목록 생성
  const monthList: string[] = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthList.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_snapshots")
    .select()
    .eq("family_id", familyId)
    .in("year_month", monthList)
    .order("year_month");
  if (error) throw error;
  return (data ?? []) as AssetSnapshot[];
}
