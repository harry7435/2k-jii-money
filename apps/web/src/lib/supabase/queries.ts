import { createClient } from "./client";
import { v4 as uuidv4 } from "uuid";
import { monthDateRange, getCurrentYearMonth } from "../utils/formatters";
import {
  DEFAULT_CATEGORY_TREE,
  DEFAULT_PAYMENT_SOURCES,
} from "../constants/categories";
import { DEFAULT_ASSET_ACCOUNTS } from "../constants/assets";
import { buildSampleData } from "../utils/sampleData";
import type { CategoryNode } from "../constants/categories";
import type {
  Category,
  Transaction,
  Budget,
  Family,
  FamilyInvite,
  Member,
  PaymentSource,
  AssetAccount,
  AssetSnapshot,
  AssetAccountType,
  MonthlyNote,
} from "@2k-jii-money/supabase-types";

// ─── Family ────────────────────────────────────────────────────────────────
//
// 가족 생성/참여는 RPC 전담이다. RLS를 켜면 "아직 속하지 않은 가족"을 클라이언트에서
// 조회할 수 없고, 조회를 허용하면 임의의 family_id로 자신을 멤버 등록할 수 있게 된다.
// 자세한 근거는 docs/superpowers/specs/2026-08-05-web-auth-rls-design.md 참조.

export async function createFamily(
  nickname: string,
): Promise<{ family: Family; member: Member }> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_family", {
    p_nickname: nickname,
  });
  if (error) throw error;

  const family = data as Family;

  // RPC는 family만 돌려주므로 방금 만들어진 본인 멤버 행을 다시 읽는다.
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("가족 생성 직후 멤버 조회에 실패했습니다.");

  await createDefaultCategories(family.id);
  await createDefaultPaymentSources(family.id);
  await createDefaultAssetAccounts(family.id);

  return membership;
}

/**
 * 샘플 데이터를 실제로 삽입한다.
 *
 * sampleData.ts 는 카테고리를 이름 경로로만 지정하므로, 여기서 방금 만들어진
 * 기본 카테고리·자산계좌의 id로 해석한다. 경로가 안 맞으면 조용히 건너뛰는 대신
 * 예외를 던진다 — 절반만 채워진 샘플이 더 나쁘다.
 */
export async function seedSampleData(
  familyId: string,
  memberId: string,
): Promise<void> {
  const supabase = createClient();
  const [categories, accounts] = await Promise.all([
    getCategories(familyId),
    getAssetAccounts(familyId),
  ]);

  const byId = new Map(categories.map((c) => [c.id, c]));

  // 경로 첫 칸은 대분류(level 1)의 자식이고, 그 뒤로는 직전 카테고리의 자식이다.
  // "미용실"처럼 서로 다른 중분류 아래 같은 이름이 있어 경로로 좁혀야 한다.
  function resolve(path: string[]): Category | null {
    let current: Category | null = null;
    for (let i = 0; i < path.length; i++) {
      const name = path[i];
      const match = categories.find((c) =>
        i === 0
          ? c.name === name &&
            c.parent_id !== null &&
            byId.get(c.parent_id)?.level === 1
          : c.name === name && c.parent_id === current!.id,
      );
      if (!match) return null;
      current = match;
    }
    return current;
  }

  const accountByName = new Map(accounts.map((a) => [a.name, a.id]));
  const { transactions, budgets, snapshots } = buildSampleData(new Date());

  const txRows = transactions.map((t) => {
    const category = resolve(t.path);
    if (!category) {
      throw new Error(
        `샘플 카테고리를 찾을 수 없습니다: ${t.path.join(" > ")}`,
      );
    }
    return {
      id: uuidv4(),
      family_id: familyId,
      member_id: memberId,
      category_id: category.id,
      type: t.type,
      amount: t.amount,
      memo: t.memo,
      date: t.date,
      time: t.time,
      payment_source_id: null,
      evaluation: t.evaluation,
    };
  });

  const budgetRows = budgets.map((b) => {
    const category = b.path ? resolve(b.path) : null;
    if (b.path && !category) {
      throw new Error(
        `샘플 예산 카테고리를 찾을 수 없습니다: ${b.path.join(" > ")}`,
      );
    }
    return {
      id: uuidv4(),
      family_id: familyId,
      category_id: category?.id ?? null,
      year_month: b.yearMonth,
      amount: b.amount,
    };
  });

  const snapshotRows = snapshots.flatMap((s) => {
    const accountId = accountByName.get(s.accountName);
    // 기본 계좌 목록이 바뀌었을 수 있으니 없는 계좌는 건너뛴다.
    if (!accountId) return [];
    return [
      {
        id: uuidv4(),
        family_id: familyId,
        account_id: accountId,
        year_month: s.yearMonth,
        amount: s.amount,
      },
    ];
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error: txErr } = await sb.from("transactions").insert(txRows);
  if (txErr) throw txErr;
  const { error: bErr } = await sb.from("budgets").insert(budgetRows);
  if (bErr) throw bErr;
  const { error: sErr } = await sb.from("asset_snapshots").insert(snapshotRows);
  if (sErr) throw sErr;
}

export async function joinFamilyByInvite(
  token: string,
  nickname: string,
): Promise<Family> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("join_family_by_invite", {
    p_token: token,
    p_nickname: nickname,
  });
  if (error) throw error;
  return data as Family;
}

export async function createInvite(): Promise<FamilyInvite> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_invite");
  if (error) throw error;
  return data as FamilyInvite;
}

export async function resetFamilyData(): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("reset_family_data");
  if (error) throw error;
}

/**
 * 로그인한 사용자의 멤버 행과 소속 가족을 함께 조회한다.
 * RLS가 이미 자기 가족으로 범위를 좁히므로 family_id 필터가 필요 없다.
 * 가족이 없으면 null — 온보딩이 끝나지 않은 상태다.
 */
export async function getCurrentMembership(): Promise<{
  family: Family;
  member: Member;
} | null> {
  const supabase = createClient();

  // getUser()가 아니라 getSession()을 쓰는 이유:
  // getUser()는 인증 서버에 네트워크 요청을 보내 토큰을 검증하므로, 로그인 직후처럼
  // 토큰이 막 발급된 시점에 일시적으로 실패할 수 있다. 그러면 user가 null이 되어
  // "가족 없음"과 구분되지 않는다. getSession()은 로컬 세션을 읽어 그 경합이 없다.
  //
  // 보안상 문제없다. 인가 판단은 서버(proxy.ts의 getUser + RLS)가 하고,
  // 여기서 얻은 user id는 내 멤버 행을 고르는 용도일 뿐이다.
  // 세션을 위조해도 RLS가 막는다.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user;
  if (!user) return null;

  // 에러를 삼키면 안 된다. RLS나 GRANT가 잘못됐을 때 "가족 없음"과 구분이 안 되고,
  // 화면에는 아무것도 안 뜨는데 콘솔도 조용해서 원인을 찾을 수가 없다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member, error: memberError } = await (supabase as any)
    .from("members")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family, error: familyError } = await (supabase as any)
    .from("families")
    .select()
    .eq("id", member.family_id)
    .maybeSingle();
  if (familyError) throw familyError;
  if (!family) {
    // 멤버 행은 보이는데 가족이 안 보인다 = families SELECT 정책이나 GRANT 문제.
    throw new Error(
      `멤버는 조회됐지만 가족(${member.family_id})을 읽을 수 없습니다. families RLS 정책을 확인하세요.`,
    );
  }

  return { family: family as Family, member: member as Member };
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

export async function getTransactionHistory(
  familyId: string,
  months: number,
): Promise<Transaction[]> {
  const supabase = createClient();
  const now = new Date();
  const oldest = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const oldestY = oldest.getFullYear();
  const oldestM = String(oldest.getMonth() + 1).padStart(2, "0");
  const oldestYM = `${oldestY}-${oldestM}`;
  const { from } = monthDateRange(oldestYM);
  const { to } = monthDateRange(getCurrentYearMonth());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("transactions")
    .select()
    .eq("family_id", familyId)
    .gte("date", from)
    .lt("date", to)
    .order("date", { ascending: true })
    .range(0, 19999);
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

// ─── Monthly Notes ────────────────────────────────────────────────────────

export async function getMonthlyNote(
  familyId: string,
  yearMonth: string,
): Promise<MonthlyNote | null> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("monthly_notes")
    .select()
    .eq("family_id", familyId)
    .eq("year_month", yearMonth)
    .single();
  return (data as MonthlyNote) ?? null;
}

export async function upsertMonthlyNote(
  familyId: string,
  yearMonth: string,
  content: string,
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("monthly_notes").upsert(
    {
      id: uuidv4(),
      family_id: familyId,
      year_month: yearMonth,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "family_id,year_month" },
  );
  if (error) throw error;
}

export async function getAssetSnapshotHistory(
  familyId: string,
  fromYearMonth: string,
  toYearMonth: string,
): Promise<AssetSnapshot[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("asset_snapshots")
    .select()
    .eq("family_id", familyId)
    .gte("year_month", fromYearMonth)
    .lte("year_month", toYearMonth)
    .order("year_month")
    .range(0, 19999);
  if (error) throw error;
  return (data ?? []) as AssetSnapshot[];
}

/**
 * 자산 탭의 저축 추이용. 거래 전체가 아니라 type='savings'만 가져온다.
 * 다월 조회라 PostgREST 기본 1000행 제한을 넘길 수 있어 range를 명시.
 */
export async function getSavingsHistory(
  familyId: string,
  fromYearMonth: string,
  toYearMonth: string,
): Promise<Transaction[]> {
  const supabase = createClient();
  const { from } = monthDateRange(fromYearMonth);
  const { to } = monthDateRange(toYearMonth);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("transactions")
    .select()
    .eq("family_id", familyId)
    .eq("type", "savings")
    .gte("date", from)
    .lt("date", to)
    .order("date", { ascending: true })
    .range(0, 19999);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}
