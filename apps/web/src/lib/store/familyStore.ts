"use client";

import { create } from "zustand";
import type { Family, Member } from "@2k-jii-money/supabase-types";

/**
 * 로그인한 사용자의 가족·멤버를 담는 메모리 전용 store.
 *
 * 예전에는 persist(localStorage)로 저장했지만, 이제 진실의 원천은 서버(Supabase Auth
 * 세션 + members.user_id)다. localStorage에 남겨두면 로그아웃 후에도 값이 남고
 * 계정을 바꿔도 이전 가족이 그대로 보인다.
 *
 * 값은 home/layout.tsx가 마운트 시 한 번 채운다.
 */
interface FamilyStore {
  family: Family | null;
  member: Member | null;
  setFamily: (family: Family) => void;
  setMember: (member: Member) => void;
  clear: () => void;
}

export const useFamilyStore = create<FamilyStore>()((set) => ({
  family: null,
  member: null,
  setFamily: (family) => set({ family }),
  setMember: (member) => set({ member }),
  clear: () => set({ family: null, member: null }),
}));
