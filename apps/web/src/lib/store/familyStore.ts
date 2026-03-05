'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Family, Member } from '@2k-jii-money/supabase-types'

interface FamilyStore {
  family: Family | null
  member: Member | null
  setFamily: (family: Family) => void
  setMember: (member: Member) => void
  clear: () => void
}

export const useFamilyStore = create<FamilyStore>()(
  persist(
    (set) => ({
      family: null,
      member: null,
      setFamily: (family) => set({ family }),
      setMember: (member) => set({ member }),
      clear: () => set({ family: null, member: null }),
    }),
    { name: 'jii-money-family' }
  )
)
