import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { listTransactions } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';
import { formatCurrency } from '../../lib/format';

export function MySalesPage() {
  const { profile } = useAuth();
  const salesQuery = useQuery({ queryKey: ['my-sales-history', profile?.id], queryFn: () => listTransactions({ userId: profile?.id }), enabled: Boolean(profile?.id) });

  return (
    <AppShell title="My Sales" subtitle="Every sale is recorded with a receipt summary that can be reopened later.">
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
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
                {salesQuery.data.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                    <TableCell>{sale.item?.name ?? 'Unknown item'}</TableCell>
                    <TableCell>{Math.abs(sale.quantity_change)}</TableCell>
                    <TableCell>{formatCurrency(Math.abs(sale.quantity_change) * (sale.unit_price_at_sale ?? 0))}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/seller/receipts/${sale.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No sales yet" description="Transactions completed by this seller will appear here." />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
