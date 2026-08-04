import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/EmptyState';
import { createItem, listItems, mutateStock, softDeleteItem, updateItem } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';
import { itemSchema, restockSchema } from '../../lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { formatCurrency } from '../../lib/format';

type ItemValues = z.infer<typeof itemSchema>;
type RestockValues = z.infer<typeof restockSchema>;

const emptyItem: ItemValues = {
  name: '',
  sku: '',
  category: '',
  unitPrice: 0,
  quantity: 0,
  reorderThreshold: 0,
  supplierNotes: '',
  imageUrl: '',
};

function buildSku(name: string, category: string) {
  return `${name}-${category}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
}

export function InventoryPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'updated_at'>('updated_at');
  const itemsQuery = useQuery({ queryKey: ['items', search], queryFn: () => listItems({ search }) });
  const items = useMemo(() => {
    const data = [...(itemsQuery.data ?? [])];
    return data.sort((left, right) => {
      if (sortBy === 'name') return left.name.localeCompare(right.name);
      if (sortBy === 'quantity') return left.quantity - right.quantity;
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [itemsQuery.data, sortBy]);

  const itemForm = useForm<ItemValues>({ resolver: zodResolver(itemSchema), defaultValues: emptyItem });
  const restockForm = useForm<RestockValues>({ resolver: zodResolver(restockSchema), defaultValues: { itemId: '', quantity: 1, notes: '' } });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      toast.success('Item added');
      itemForm.reset(emptyItem);
      itemsQuery.refetch();
      setEditingId(null);
      setItemDialogOpen(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to add item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => updateItem(id, payload),
    onSuccess: () => {
      toast.success('Item updated');
      itemsQuery.refetch();
      setEditingId(null);
      setItemDialogOpen(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to update item'),
  });

  const deleteMutation = useMutation({
    mutationFn: softDeleteItem,
    onSuccess: () => {
      toast.success('Item removed');
      itemsQuery.refetch();
      setDeletingId(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to delete item'),
  });

  const restockMutation = useMutation({
    mutationFn: async (values: RestockValues) => mutateStock({ itemId: values.itemId, quantity: values.quantity, type: 'RESTOCK', userId: profile!.id, notes: values.notes }),
    onSuccess: () => {
      toast.success('Restock recorded');
      itemsQuery.refetch();
      setRestockId(null);
      restockForm.reset({ itemId: '', quantity: 1, notes: '' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to restock item'),
  });

  const onSave = itemForm.handleSubmit((values) => {
    const sku = editingId ? values.sku : buildSku(values.name, values.category);
    const payload = {
      name: values.name,
      sku,
      category: values.category,
      unit_price: values.unitPrice,
      quantity: values.quantity,
      reorder_threshold: values.reorderThreshold ?? 0,
      supplier_notes: values.supplierNotes ?? '',
      image_url: values.imageUrl ?? '',
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  });

  const openEdit = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    itemForm.reset({
      name: item.name,
      sku: item.sku,
      category: item.category,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      reorderThreshold: item.reorder_threshold ?? 0,
      supplierNotes: item.supplier_notes ?? '',
      imageUrl: item.image_url ?? '',
    });
    setEditingId(id);
    setItemDialogOpen(true);
  };

  return (
    <AppShell title="Inventory" subtitle="Add, edit, remove, and restock items. Sales and restocks stay separate in the activity trail.">
      <Card className="mb-6">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4 w-full">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input placeholder="Name, SKU, category" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sort</Label>
              <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                <option value="updated_at">Recently updated</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Add item</Label>
              <Button onClick={() => { setEditingId(null); itemForm.reset(emptyItem); setItemDialogOpen(true); }}>Open form</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory table</CardTitle>
        </CardHeader>
        <CardContent>
          {itemsQuery.isLoading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-2xl bg-muted" />
              <div className="h-12 animate-pulse rounded-2xl bg-muted" />
              <div className="h-12 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.sku}</div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      {item.quantity <= item.reorder_threshold ? (
                        <Badge variant={item.quantity <= 0 ? 'destructive' : 'warning'}>Low stock</Badge>
                      ) : (
                        <Badge variant="secondary">Healthy</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(item.id)}>Edit</Button>
                        <Button variant="secondary" size="sm" onClick={() => { setRestockId(item.id); restockForm.reset({ itemId: item.id, quantity: 1, notes: '' }); }}>Restock</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingId(item.id)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No inventory found" description="Add the first item or adjust the search terms." />
          )}
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={(open) => { setItemDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit item' : 'Add item'}</DialogTitle>
            <DialogDescription>Sellers cannot change these fields. Inventory edits remain admin-only.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name of the Product</Label><Input {...itemForm.register('name')} /></div>
              <div className="space-y-2"><Label>Category</Label><Input {...itemForm.register('category')} /></div>
              <div className="space-y-2"><Label>Unit Price</Label><Input type="number" step="0.01" {...itemForm.register('unitPrice')} /></div>
              <div className="space-y-2"><Label>Quantity</Label><Input type="number" {...itemForm.register('quantity')} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              <Button type="submit" disabled={itemForm.formState.isSubmitting}>{editingId ? 'Save changes' : 'Add item'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(restockId)} onOpenChange={(open) => !open && setRestockId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock item</DialogTitle>
            <DialogDescription>Restock is logged separately from sales with a RESTOCK transaction.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={restockForm.handleSubmit((values) => restockMutation.mutate(values))}>
            <div className="space-y-2"><Label>Quantity</Label><Input type="number" min="1" {...restockForm.register('quantity')} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea {...restockForm.register('notes')} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRestockId(null)}>Cancel</Button>
              <Button type="submit" disabled={restockMutation.isPending}>{restockMutation.isPending ? 'Saving...' : 'Record restock'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>This is a soft delete. The row stays for audit history, but it is hidden from normal views.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && deleteMutation.mutate(deletingId)} disabled={deleteMutation.isPending}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
