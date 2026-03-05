export type { Database } from './database.types'
import type { Database } from './database.types'

// Row types (reading data)
export type Family = Database['public']['Tables']['families']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Budget = Database['public']['Tables']['budgets']['Row']

// Insert types (creating records)
export type NewFamily = Database['public']['Tables']['families']['Insert']
export type NewMember = Database['public']['Tables']['members']['Insert']
export type NewCategory = Database['public']['Tables']['categories']['Insert']
export type NewTransaction = Database['public']['Tables']['transactions']['Insert']
export type NewBudget = Database['public']['Tables']['budgets']['Insert']

// Enums
export type TransactionType = 'income' | 'expense'
