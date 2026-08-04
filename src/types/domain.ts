import type { Role } from '../lib/role';

export type Item = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number;
  quantity: number;
  reorder_threshold: number;
  supplier_notes: string | null;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type TransactionType = 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'REMOVAL';

export type Transaction = {
  id: string;
  item_id: string;
  user_id: string;
  type: TransactionType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_price_at_sale: number | null;
  created_at: string;
  item?: Pick<Item, 'name' | 'sku' | 'category'> | null;
  user?: { name: string | null; email: string | null } | null;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string;
  created_at: string;
  user?: { name: string | null; email: string | null } | null;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_deleted: boolean;
  must_change_password: boolean;
  created_at: string;
};

export type DashboardSummary = {
  totalItems: number;
  totalSalesToday: number;
  totalRevenueToday: number;
  lowStockCount: number;
};

export type SaleReceipt = {
  transactionId: string;
  itemName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
  timestamp: string;
};

export type AccountRow = Profile & {
  last_sign_in_at: string | null;
};
