import { createClient } from './client'
import { v4 as uuidv4 } from 'uuid'
import { monthDateRange } from '../utils/formatters'
import { DEFAULT_CATEGORIES } from '../constants/categories'
import type { Category, Transaction, Budget, Family, Member } from '@2k-jii-money/supabase-types'

const FAMILY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateFamilyCode(): string {
  return Array.from({ length: 6 }, () =>
    FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)]
  ).join('')
}

// ─── Family ────────────────────────────────────────────────────────────────

export async function createFamily(nickname: string): Promise<{ family: Family; member: Member }> {
  const supabase = createClient()
  const familyCode = generateFamilyCode()
  const familyId = uuidv4()
  const memberId = uuidv4()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: family, error: fErr } = await (supabase as any)
    .from('families')
    .insert({ id: familyId, family_code: familyCode })
    .select()
    .single()
  if (fErr) throw fErr

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: member, error: mErr } = await (supabase as any)
    .from('members')
    .insert({ id: memberId, family_id: familyId, nickname })
    .select()
    .single()
  if (mErr) throw mErr

  await createDefaultCategories(familyId)

  return { family: family as Family, member: member as Member }
}

export async function findFamilyByCode(code: string): Promise<Family | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('families')
    .select()
    .eq('family_code', code.toUpperCase())
    .single()
  return (data as Family) ?? null
}

export async function joinFamily(familyId: string, nickname: string): Promise<Member> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('members')
    .insert({ id: uuidv4(), family_id: familyId, nickname })
    .select()
    .single()
  if (error) throw error
  return data as Member
}

export async function getMembers(familyId: string): Promise<Member[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('members')
    .select()
    .eq('family_id', familyId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Member[]
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function createDefaultCategories(familyId: string): Promise<void> {
  const supabase = createClient()
  const rows = DEFAULT_CATEGORIES.map((c) => ({
    id: uuidv4(),
    family_id: familyId,
    name: c.name,
    icon: c.icon,
    color: c.color,
    is_default: c.isDefault,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('categories').insert(rows)
  if (error) throw error
}

export async function getCategories(familyId: string): Promise<Category[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('categories')
    .select()
    .eq('family_id', familyId)
    .order('is_default', { ascending: false })
    .order('name')
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function addCategory(
  familyId: string,
  name: string,
  icon: string,
  color: string
): Promise<Category> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('categories')
    .insert({ id: uuidv4(), family_id: familyId, name, icon, color, is_default: false })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('categories').delete().eq('id', id)
  if (error) throw error
}

// ─── Transactions ──────────────────────────────────────────────────────────

export async function getTransactions(familyId: string, yearMonth: string): Promise<Transaction[]> {
  const supabase = createClient()
  const { from, to } = monthDateRange(yearMonth)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transactions')
    .select()
    .eq('family_id', familyId)
    .gte('date', from)
    .lt('date', to)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Transaction[]
}

export async function addTransaction(params: {
  familyId: string
  memberId: string
  categoryId: string
  type: 'income' | 'expense'
  amount: number
  memo?: string
  date: string
}): Promise<Transaction> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transactions')
    .insert({
      id: uuidv4(),
      family_id: params.familyId,
      member_id: params.memberId,
      category_id: params.categoryId,
      type: params.type,
      amount: params.amount,
      memo: params.memo || null,
      date: params.date,
    })
    .select()
    .single()
  if (error) throw error
  return data as Transaction
}

export async function updateTransaction(
  id: string,
  params: {
    categoryId: string
    type: 'income' | 'expense'
    amount: number
    memo?: string
    date: string
  }
): Promise<Transaction> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('transactions')
    .update({
      category_id: params.categoryId,
      type: params.type,
      amount: params.amount,
      memo: params.memo || null,
      date: params.date,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Transaction
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function getMonthlySummary(
  familyId: string,
  yearMonth: string
): Promise<{ income: number; expense: number }> {
  const transactions = await getTransactions(familyId, yearMonth)
  return transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount
      else acc.expense += t.amount
      return acc
    },
    { income: 0, expense: 0 }
  )
}

// ─── Budgets ───────────────────────────────────────────────────────────────

export async function getBudgets(familyId: string, yearMonth: string): Promise<Budget[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('budgets')
    .select()
    .eq('family_id', familyId)
    .eq('year_month', yearMonth)
  if (error) throw error
  return (data ?? []) as Budget[]
}

export async function setBudget(
  familyId: string,
  categoryId: string | null,
  yearMonth: string,
  amount: number
): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('budgets')
    .select('id')
    .eq('family_id', familyId)
    .eq('year_month', yearMonth)

  query = categoryId ? query.eq('category_id', categoryId) : query.is('category_id', null)

  const { data: existing } = await query.single()

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('budgets')
      .update({ amount })
      .eq('id', (existing as { id: string }).id)
    if (error) throw error
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('budgets')
      .insert({ id: uuidv4(), family_id: familyId, category_id: categoryId, year_month: yearMonth, amount })
    if (error) throw error
  }
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('budgets').delete().eq('id', id)
  if (error) throw error
}
