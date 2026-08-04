import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { getReceipt } from '../../lib/api';
import { formatCurrency } from '../../lib/format';

export function ReceiptPage() {
  const { transactionId } = useParams();
  const location = useLocation();
  const initial = location.state as { receipt?: { id: string; quantity_change: number; unit_price_at_sale: number | null; created_at: string; item?: { name: string; sku: string } | null } } | null;
  const query = useQuery({ queryKey: ['receipt', transactionId], queryFn: () => getReceipt(transactionId ?? ''), enabled: !initial?.receipt && Boolean(transactionId) });
  const receipt = initial?.receipt
    ? {
        transactionId: initial.receipt.id,
        itemName: initial.receipt.item?.name ?? 'Unknown item',
        sku: initial.receipt.item?.sku ?? '-',
        quantity: Math.abs(initial.receipt.quantity_change),
        price: initial.receipt.unit_price_at_sale ?? 0,
        total: Math.abs(initial.receipt.quantity_change) * (initial.receipt.unit_price_at_sale ?? 0),
        timestamp: initial.receipt.created_at,
      }
    : query.data;

  return (
    <AppShell title="Receipt" subtitle="Reopen, print, or keep the sales summary for later reference.">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Transaction summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {receipt ? (
            <>
              <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Item</span><div className="font-medium">{receipt.itemName}</div></div>
                <div><span className="text-muted-foreground">SKU</span><div className="font-medium">{receipt.sku}</div></div>
                <div><span className="text-muted-foreground">Quantity</span><div className="font-medium">{receipt.quantity}</div></div>
                <div><span className="text-muted-foreground">Total</span><div className="font-medium">{formatCurrency(receipt.total)}</div></div>
                <div><span className="text-muted-foreground">Unit price</span><div className="font-medium">{formatCurrency(receipt.price)}</div></div>
                <div><span className="text-muted-foreground">Timestamp</span><div className="font-medium">{new Date(receipt.timestamp).toLocaleString()}</div></div>
              </div>
              <Button type="button" onClick={() => window.print()}>Print receipt</Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Receipt not found.</div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
