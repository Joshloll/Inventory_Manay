import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../lib/format';
import { listItems, listTransactions, mutateStock } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';
import { sellSchema } from '../../lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

type SellValues = z.infer<typeof sellSchema>;

export function SellerHomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ transactionId: string; itemName: string; sku: string; quantity: number; price: number; total: number; timestamp: string } | null>(null);
  const itemsQuery = useQuery({ queryKey: ['seller-items', search], queryFn: () => listItems({ search }) });
  const salesQuery = useQuery({ queryKey: ['my-sales', profile?.id], queryFn: () => listTransactions({ userId: profile?.id }), enabled: Boolean(profile?.id) });
  const sellForm = useForm<SellValues>({ resolver: zodResolver(sellSchema), defaultValues: { itemId: '', quantity: 1 } });

  const filteredItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedItem) {
      sellForm.setValue('itemId', selectedItem.id);
    }
  }, [selectedItem, sellForm]);

  const sellMutation = useMutation({
    mutationFn: async (values: SellValues) => mutateStock({ itemId: values.itemId, quantity: values.quantity, type: 'SALE', userId: profile!.id, unitPriceAtSale: selectedItem?.unit_price ?? 0 }),
    onSuccess: (data) => {
      toast.success('Sale completed');
      itemsQuery.refetch();
      salesQuery.refetch();
      const transaction = Array.isArray(data) ? data[0] : data;
      if (transaction) {
        setReceipt({
          transactionId: transaction.id,
          itemName: selectedItem?.name ?? 'Unknown item',
          sku: selectedItem?.sku ?? '-',
          quantity: transaction.quantity_change ? Math.abs(transaction.quantity_change) : 0,
          price: selectedItem?.unit_price ?? 0,
          total: (selectedItem?.unit_price ?? 0) * (transaction.quantity_change ? Math.abs(transaction.quantity_change) : 0),
          timestamp: transaction.created_at,
        });
        navigate(`/seller/receipts/${transaction.id}`, { state: { receipt: transaction } });
      }
      setSelectedId(null);
      sellForm.reset({ itemId: '', quantity: 1 });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to complete sale'),
  });

  return (
    <AppShell title="Inventory View" subtitle="Sellers can search stock, complete sales, and review their own transaction history.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Search by name, SKU, or category" value={search} onChange={(event) => setSearch(event.target.value)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Available items</CardTitle>
          </CardHeader>
          <CardContent>
            {itemsQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading inventory...</div>
            ) : filteredItems.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku} · {item.category}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.quantity <= item.reorder_threshold ? <Badge variant={item.quantity <= 0 ? 'destructive' : 'warning'}>Low stock</Badge> : <Badge variant="secondary">Ready</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setSelectedId(item.id); sellForm.setValue('itemId', item.id); }}>Sell</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="No items match the search" description="Adjust the filter or wait for stock to be added." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sell / checkout</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <form className="space-y-4" onSubmit={sellForm.handleSubmit((values) => sellMutation.mutate(values))}>
                <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-muted-foreground">{selectedItem.sku} · {selectedItem.category}</div>
                  <div className="mt-2 text-lg font-semibold">{formatCurrency(selectedItem.unit_price)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" max={selectedItem.quantity} {...sellForm.register('quantity')} />
                </div>
                <Button className="w-full" type="submit" disabled={sellMutation.isPending || selectedItem.quantity <= 0}>
                  {sellMutation.isPending ? 'Processing...' : 'Complete sale'}
                </Button>
              </form>
            ) : (
              <EmptyState title="Select an item" description="Choose an item from the list to start a sale." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>My sales</CardTitle>
        </CardHeader>
        <CardContent>
          {salesQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesQuery.data.slice(0, 10).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                    <TableCell>{sale.item?.name ?? 'Unknown item'}</TableCell>
                    <TableCell>{Math.abs(sale.quantity_change)}</TableCell>
                    <TableCell>{formatCurrency(Math.abs(sale.quantity_change) * (sale.unit_price_at_sale ?? 0))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/seller/receipts/${sale.id}`)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No sales yet" description="Once a sale is completed it will appear here." />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receipt ready</DialogTitle>
            <DialogDescription>The receipt can be re-opened from My Sales or printed now.</DialogDescription>
          </DialogHeader>
          {receipt ? (
            <div className="space-y-2 rounded-2xl border bg-muted/30 p-4 text-sm">
              <div className="font-medium">{receipt.itemName}</div>
              <div>SKU: {receipt.sku}</div>
              <div>Quantity: {receipt.quantity}</div>
              <div>Unit price: {formatCurrency(receipt.price)}</div>
              <div>Total: {formatCurrency(receipt.total)}</div>
              <div>Time: {new Date(receipt.timestamp).toLocaleString()}</div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
