import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { listItems, listTransactions } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const transactionsQuery = useQuery({ queryKey: ['reports-transactions', from, to], queryFn: () => listTransactions({}) });
  const itemsQuery = useQuery({ queryKey: ['reports-items'], queryFn: () => listItems({ includeDeleted: true }) });

  const filteredTransactions = useMemo(() => {
    const start = from ? new Date(from).getTime() : -Infinity;
    const end = to ? new Date(to).getTime() : Infinity;
    return (transactionsQuery.data ?? []).filter((row) => {
      const timestamp = new Date(row.created_at).getTime();
      return timestamp >= start && timestamp <= end;
    });
  }, [from, to, transactionsQuery.data]);

  const exportCsv = () => {
    const rows = filteredTransactions.map((row) => ({
      timestamp: row.created_at,
      action: row.type,
      item: row.item?.name ?? '',
      sku: row.item?.sku ?? '',
      quantity: row.quantity_change,
      before: row.quantity_before,
      after: row.quantity_after,
      unitPrice: row.unit_price_at_sale ?? 0,
    }));
    const header = Object.keys(rows[0] ?? { timestamp: '', action: '', item: '', sku: '', quantity: '', before: '', after: '', unitPrice: '' });
    const csv = [header.join(','), ...rows.map((row) => header.map((key) => JSON.stringify((row as Record<string, unknown>)[key] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-report-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    link.click();
    toast.success('CSV exported');
  };

  const exportXlsx = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredTransactions.map((row) => ({
      timestamp: row.created_at,
      action: row.type,
      item: row.item?.name ?? '',
      sku: row.item?.sku ?? '',
      quantity: row.quantity_change,
      before: row.quantity_before,
      after: row.quantity_after,
      unitPrice: row.unit_price_at_sale ?? 0,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `inventory-report-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
    toast.success('Excel exported');
  };

  return (
    <AppShell title="Reports / Export" subtitle="Export sales or inventory snapshots to CSV or Excel for record keeping.">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter range</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>From</Label><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></div>
          <div className="space-y-2"><Label>To</Label><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={exportCsv}>Export CSV</Button>
            <Button variant="secondary" onClick={exportXlsx}>Export Excel</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction extract</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.slice(0, 10).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDateTime(row.created_at)}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.item?.name ?? 'Unknown item'}</TableCell>
                  <TableCell>{row.quantity_change}</TableCell>
                  <TableCell>{formatCurrency(Math.abs(row.quantity_change) * (row.unit_price_at_sale ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inventory snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Current stock rows: {itemsQuery.data?.length ?? 0}</div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
