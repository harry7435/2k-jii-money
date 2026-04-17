import type { AssetAccountType } from "@2k-jii-money/supabase-types";

export const ASSET_ACCOUNT_TYPE_MAP: Record<
  AssetAccountType,
  { label: string; icon: string }
> = {
  cash: { label: "현금", icon: "payments" },
  bank: { label: "은행", icon: "account_balance" },
  savings: { label: "저축", icon: "savings" },
  investment: { label: "투자", icon: "trending_up" },
  other: { label: "기타", icon: "more_horiz" },
  liability: { label: "부채", icon: "credit_card_off" },
};

export const ASSET_TYPE_ORDER: AssetAccountType[] = [
  "cash",
  "bank",
  "savings",
  "investment",
  "other",
  "liability",
];

export const DEFAULT_ASSET_ACCOUNTS: {
  name: string;
  account_type: AssetAccountType;
}[] = [
  { name: "현금", account_type: "cash" },
  { name: "우리은행", account_type: "bank" },
  { name: "기업은행", account_type: "bank" },
  { name: "카카오뱅크", account_type: "bank" },
  { name: "농협", account_type: "bank" },
  { name: "주택청약", account_type: "savings" },
  { name: "청년도약계좌", account_type: "savings" },
  { name: "토지", account_type: "investment" },
  { name: "ISA", account_type: "investment" },
];
