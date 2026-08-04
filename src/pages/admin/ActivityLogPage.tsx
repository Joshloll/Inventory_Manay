import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/EmptyState';
import { listActivityLogs } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

export function ActivityLogPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const query = useQuery({ queryKey: ['activity-log', search, page], queryFn: () => listActivityLogs({ search, page, pageSize }) });
  const totalPages = useMemo(() => Math.max(1, Math.ceil((query.data?.count ?? 0) / pageSize)), [pageSize, query.data?.count]);

  return (
    <AppShell title="Seller Activity Log" subtitle="Audit trail for sales, restocks, adjustments, and account actions.">
      <Card className="mb-6">
        <CardHeader className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input placeholder="Action, target, details" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity records</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading activity logs...</div>
          ) : query.data?.data.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    <TableCell>{entry.user?.name ?? entry.user?.email ?? 'System'}</TableCell>
                    <TableCell><Badge variant={entry.action === 'REMOVAL' ? 'destructive' : entry.action === 'RESTOCK' ? 'success' : entry.action === 'ADJUSTMENT' ? 'warning' : 'secondary'}>{entry.action}</Badge></TableCell>
                    <TableCell>{entry.target_type}{entry.target_id ? ` · ${entry.target_id.slice(0, 8)}` : ''}</TableCell>
                    <TableCell>{entry.details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No activity yet" description="Actions recorded by the system will appear here." />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
