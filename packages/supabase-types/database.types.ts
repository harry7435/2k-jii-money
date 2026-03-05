// AUTO-GENERATED - do not edit manually
// Run: pnpm type-gen to regenerate from live database
// Source: supabase/schema.sql

export type Database = {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          family_code: string
          created_at: string
        }
        Insert: {
          id: string
          family_code: string
          created_at?: string | null
        }
        Update: {
          id?: string
          family_code?: string
          created_at?: string | null
        }
      }
      members: {
        Row: {
          id: string
          family_id: string
          nickname: string
          created_at: string
        }
        Insert: {
          id: string
          family_id: string
          nickname: string
          created_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          nickname?: string
          created_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          family_id: string
          name: string
          icon: string
          color: string
          is_default: boolean
        }
        Insert: {
          id: string
          family_id: string
          name: string
          icon: string
          color: string
          is_default?: boolean
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          icon?: string
          color?: string
          is_default?: boolean
        }
      }
      transactions: {
        Row: {
          id: string
          family_id: string
          member_id: string
          category_id: string
          type: 'income' | 'expense'
          amount: number
          memo: string | null
          date: string
          created_at: string
        }
        Insert: {
          id: string
          family_id: string
          member_id: string
          category_id: string
          type: 'income' | 'expense'
          amount: number
          memo?: string | null
          date: string
          created_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          member_id?: string
          category_id?: string
          type?: 'income' | 'expense'
          amount?: number
          memo?: string | null
          date?: string
          created_at?: string | null
        }
      }
      budgets: {
        Row: {
          id: string
          family_id: string
          category_id: string
          year_month: string
          amount: number
          created_at: string
        }
        Insert: {
          id: string
          family_id: string
          category_id: string
          year_month: string
          amount: number
          created_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          category_id?: string
          year_month?: string
          amount?: number
          created_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      transaction_type: 'income' | 'expense'
    }
  }
}
