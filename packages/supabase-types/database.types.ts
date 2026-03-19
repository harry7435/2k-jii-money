// AUTO-GENERATED - do not edit manually
// Run: pnpm type-gen to regenerate from live database
// Source: supabase/schema.sql

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'members_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          }
        ]
      }
      categories: {
        Row: {
          id: string
          family_id: string
          name: string
          icon: string
          color: string
          is_default: boolean
          level: number
          parent_id: string | null
          is_fixed: boolean
        }
        Insert: {
          id: string
          family_id: string
          name: string
          icon: string
          color: string
          is_default?: boolean
          level?: number
          parent_id?: string | null
          is_fixed?: boolean
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          icon?: string
          color?: string
          is_default?: boolean
          level?: number
          parent_id?: string | null
          is_fixed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'categories_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
      payment_sources: {
        Row: {
          id: string
          family_id: string
          name: string
          is_default: boolean
          sort_order: number
        }
        Insert: {
          id: string
          family_id: string
          name: string
          is_default?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          is_default?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'payment_sources_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          family_id: string
          member_id: string
          category_id: string
          type: 'income' | 'expense' | 'savings'
          amount: number
          memo: string | null
          date: string
          payment_source_id: string | null
          evaluation: 'consumption' | 'waste' | 'investment' | null
          created_at: string
        }
        Insert: {
          id: string
          family_id: string
          member_id: string
          category_id: string
          type: 'income' | 'expense' | 'savings'
          amount: number
          memo?: string | null
          date: string
          payment_source_id?: string | null
          evaluation?: 'consumption' | 'waste' | 'investment' | null
          created_at?: string | null
        }
        Update: {
          id?: string
          family_id?: string
          member_id?: string
          category_id?: string
          type?: 'income' | 'expense' | 'savings'
          amount?: number
          memo?: string | null
          date?: string
          payment_source_id?: string | null
          evaluation?: 'consumption' | 'waste' | 'investment' | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_payment_source_id_fkey'
            columns: ['payment_source_id']
            isOneToOne: false
            referencedRelation: 'payment_sources'
            referencedColumns: ['id']
          }
        ]
      }
      budgets: {
        Row: {
          id: string
          family_id: string
          category_id: string | null
          year_month: string
          amount: number
          created_at: string
        }
        Insert: {
          id: string
          family_id: string
          category_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: 'budgets_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'budgets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
