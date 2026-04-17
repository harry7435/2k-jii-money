export type { Database } from "./database.types";
import type { Database } from "./database.types";

// Row types (reading data)
export type Family = Database["public"]["Tables"]["families"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type PaymentSource =
  Database["public"]["Tables"]["payment_sources"]["Row"];

// Insert types (creating records)
export type NewFamily = Database["public"]["Tables"]["families"]["Insert"];
export type NewMember = Database["public"]["Tables"]["members"]["Insert"];
export type NewCategory = Database["public"]["Tables"]["categories"]["Insert"];
export type NewTransaction =
  Database["public"]["Tables"]["transactions"]["Insert"];
export type NewBudget = Database["public"]["Tables"]["budgets"]["Insert"];
export type NewPaymentSource =
  Database["public"]["Tables"]["payment_sources"]["Insert"];

// Asset types
export type AssetAccount =
  Database["public"]["Tables"]["asset_accounts"]["Row"];
export type AssetSnapshot =
  Database["public"]["Tables"]["asset_snapshots"]["Row"];
export type NewAssetAccount =
  Database["public"]["Tables"]["asset_accounts"]["Insert"];
export type NewAssetSnapshot =
  Database["public"]["Tables"]["asset_snapshots"]["Insert"];
export type AssetAccountType =
  | "cash"
  | "bank"
  | "savings"
  | "investment"
  | "other"
  | "liability";

// Enums
export type TransactionType = "income" | "expense" | "savings";
export type EvaluationType = "consumption" | "waste" | "investment";
