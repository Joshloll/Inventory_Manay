import { endOfDay, startOfDay } from 'date-fns';
import { supabase } from './supabase';
import type { AccountRow, ActivityLog, DashboardSummary, Item, Profile, SaleReceipt, Transaction } from '../types/domain';

function asCurrencyValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at, is_active, is_deleted, must_change_password')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function listItems(params: { search?: string; includeDeleted?: boolean } = {}) {
  let query = supabase
    .from('items')
    .select('id, name, sku, category, unit_price, quantity, reorder_threshold, supplier_notes, image_url, is_deleted, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (params.search) {
    const search = `%${params.search}%`;
    query = query.or(`name.ilike.${search},sku.ilike.${search},category.ilike.${search}`);
  }

  if (!params.includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function getDashboardSummary() {
  const [{ count: itemCount, error: itemError }, salesResult, lowStockResult] = await Promise.all([
    supabase.from('items').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('transactions').select('quantity_change, quantity_before, quantity_after, unit_price_at_sale, created_at, type').eq('type', 'SALE'),
    supabase.from('items').select('quantity, reorder_threshold').eq('is_deleted', false),
  ]);

  if (itemError) throw itemError;
  if (salesResult.error) throw salesResult.error;
  if (lowStockResult.error) throw lowStockResult.error;

  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();
  const salesToday = (salesResult.data ?? []).filter((row) => row.created_at >= todayStart && row.created_at <= todayEnd);
  const totalRevenueToday = salesToday.reduce((sum, row) => sum + Math.abs(Number(row.quantity_change)) * asCurrencyValue(row.unit_price_at_sale), 0);
  const lowStockCount = (lowStockResult.data ?? []).filter((item) => Number(item.quantity) <= Number(item.reorder_threshold)).length;

  return {
    totalItems: itemCount ?? 0,
    totalSalesToday: salesToday.length,
    totalRevenueToday,
    lowStockCount,
  } satisfies DashboardSummary;
}

export async function listTransactions(params: { userId?: string; limit?: number } = {}) {
  let query = supabase
    .from('transactions')
    .select('id, item_id, user_id, type, quantity_change, quantity_before, quantity_after, unit_price_at_sale, created_at, item:items(name, sku, category), user:profiles(name, email)')
    .order('created_at', { ascending: false });

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    item: Array.isArray(row.item) ? row.item[0] ?? null : row.item ?? null,
    user: Array.isArray(row.user) ? row.user[0] ?? null : row.user ?? null,
  })) as Transaction[];
}

export async function listActivityLogs(params: { page?: number; pageSize?: number; search?: string } = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  let query = supabase
    .from('activity_logs')
    .select('id, user_id, action, target_type, target_id, details, created_at, user:profiles(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (params.search) {
    const search = `%${params.search}%`;
    query = query.or(`action.ilike.${search},target_type.ilike.${search},details.ilike.${search}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    data: (data ?? []).map((row) => ({
      ...row,
      user: Array.isArray(row.user) ? row.user[0] ?? null : row.user ?? null,
    })) as ActivityLog[],
    count: count ?? 0,
  };
}

export async function listAccounts() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, created_at, is_active, is_deleted, must_change_password, last_sign_in_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

export async function getSalesChartData(range: 'day' | 'week' | 'month') {
  const now = new Date();
  const start = range === 'day' ? startOfDay(now) : range === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const { data, error } = await supabase
    .from('transactions')
    .select('created_at, quantity_change, unit_price_at_sale, item:items(name)')
    .eq('type', 'SALE')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).reduce<Array<{ label: string; revenue: number; quantity: number }>>((acc, row) => {
    const label = range === 'day' ? new Date(row.created_at).getHours().toString().padStart(2, '0') + ':00' : new Date(row.created_at).toLocaleDateString();
    const current = acc.find((entry) => entry.label === label);
    const revenue = Math.abs(Number(row.quantity_change)) * asCurrencyValue(row.unit_price_at_sale);
    if (current) {
      current.revenue += revenue;
      current.quantity += Math.abs(Number(row.quantity_change));
    } else {
      acc.push({ label, revenue, quantity: Math.abs(Number(row.quantity_change)) });
    }
    return acc;
  }, []);
}

export async function getBestSellingItems(range: 'day' | 'week' | 'month') {
  const now = new Date();
  const start = range === 'day' ? startOfDay(now) : range === 'week' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const { data, error } = await supabase
    .from('transactions')
    .select('quantity_change, unit_price_at_sale, item:items(name, sku)')
    .eq('type', 'SALE')
    .gte('created_at', start.toISOString());

  if (error) throw error;

  const grouped = new Map<string, { name: string; sku: string; sold: number; revenue: number }>();
  for (const row of data ?? []) {
    const item = Array.isArray(row.item) ? row.item[0] ?? null : row.item ?? null;
    const key = item?.sku ?? 'unknown';
    const current = grouped.get(key) ?? { name: item?.name ?? 'Unknown', sku: item?.sku ?? 'unknown', sold: 0, revenue: 0 };
    const quantity = Math.abs(Number(row.quantity_change));
    current.sold += quantity;
    current.revenue += quantity * asCurrencyValue(row.unit_price_at_sale);
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((left, right) => right.sold - left.sold).slice(0, 10);
}

export async function getLowStockItems() {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, sku, category, unit_price, quantity, reorder_threshold, supplier_notes, image_url, is_deleted, created_at, updated_at')
    .eq('is_deleted', false)
    .order('quantity', { ascending: true });

  if (error) throw error;
  return (data ?? []).filter((item) => item.quantity <= item.reorder_threshold) as Item[];
}

export async function mutateStock(input: {
  itemId: string;
  quantity: number;
  type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
  userId: string;
  unitPriceAtSale?: number | null;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc('adjust_inventory_transaction', {
    p_item_id: input.itemId,
    p_user_id: input.userId,
    p_quantity_change: input.type === 'SALE' ? -Math.abs(input.quantity) : Math.abs(input.quantity),
    p_type: input.type,
    p_unit_price_at_sale: input.unitPriceAtSale ?? null,
    p_details: input.notes ? { notes: input.notes } : {},
  });

  if (error) throw error;
  return data;
}

export async function createItem(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('items').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateItem(itemId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('items').update(payload).eq('id', itemId).select('*').single();
  if (error) throw error;
  return data;
}

export async function softDeleteItem(itemId: string) {
  const { error } = await supabase.from('items').update({ is_deleted: true }).eq('id', itemId);
  if (error) throw error;
}

export async function invokeAccountAction(body: { action: 'create' | 'delete' | 'deactivate'; profileId?: string; email?: string; password?: string; name?: string; role?: 'ADMIN' | 'SELLER' }) {
  const { data, error } = await supabase.functions.invoke('admin-accounts', { body });
  if (error) throw error;
  return data;
}

export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function clearPasswordChangeFlag(userId: string) {
  const { error } = await supabase.from('profiles').update({ must_change_password: false }).eq('id', userId);
  if (error) throw error;
}

export async function getReceipt(transactionId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, created_at, quantity_change, unit_price_at_sale, item:items(name, sku), quantity_after')
    .eq('id', transactionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const item = Array.isArray(data.item) ? data.item[0] ?? null : data.item ?? null;
  return {
    transactionId: data.id,
    itemName: item?.name ?? 'Unknown item',
    sku: item?.sku ?? '-',
    quantity: Math.abs(Number(data.quantity_change)),
    price: asCurrencyValue(data.unit_price_at_sale),
    total: Math.abs(Number(data.quantity_change)) * asCurrencyValue(data.unit_price_at_sale),
    timestamp: data.created_at,
  } satisfies SaleReceipt;
}
