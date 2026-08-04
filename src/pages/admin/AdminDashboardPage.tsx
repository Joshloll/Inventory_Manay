import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '../../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { StatCard } from '../../components/StatCard';
import { formatCurrency, formatNumber } from '../../lib/format';
import { getBestSellingItems, getDashboardSummary, getLowStockItems, getSalesChartData } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { useState } from 'react';

const ranges = ['day', 'week', 'month'] as const;

export function AdminDashboardPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>('week');
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const chart = useQuery({ queryKey: ['sales-chart', range], queryFn: () => getSalesChartData(range) });
  const bestSellers = useQuery({ queryKey: ['best-sellers', range], queryFn: () => getBestSellingItems(range) });
  const lowStock = useQuery({ queryKey: ['low-stock'], queryFn: getLowStockItems });

  return (
    <AppShell
      title="Sales Tracker"
      subtitle="Track selling velocity, urgent replenishment, and today's revenue from one dashboard."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : summary.data ? (
          <>
            <StatCard title="Total items" value={formatNumber(summary.data.totalItems)} description="Active inventory rows" />
            <StatCard title="Sales today" value={formatNumber(summary.data.totalSalesToday)} description="Transactions recorded today" />
            <StatCard title="Revenue today" value={formatCurrency(summary.data.totalRevenueToday)} description="Daily sales total" />
            <StatCard title="Low stock" value={formatNumber(summary.data.lowStockCount)} description="Items below threshold" />
          </>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Best-selling products</CardTitle>
              <p className="text-sm text-muted-foreground">Filter by day, week, or month.</p>
            </div>
            <div className="flex gap-2">
              {ranges.map((item) => (
                <Button key={item} variant={range === item ? 'default' : 'outline'} size="sm" onClick={() => setRange(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[360px]">
            {chart.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chart.data && chart.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No sales yet" description="When sales start flowing in, the chart will appear here." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low-stock panel</CardTitle>
            <p className="text-sm text-muted-foreground">Sorted by urgency, lowest stock first.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.isLoading ? (
              <Skeleton className="h-48" />
            ) : lowStock.data && lowStock.data.length > 0 ? (
              lowStock.data.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border bg-muted/40 p-4">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.sku} · {item.category}</div>
                  </div>
                  <Badge variant={item.quantity <= 0 ? 'destructive' : item.quantity <= item.reorder_threshold / 2 ? 'warning' : 'secondary'}>
                    {item.quantity} left
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyState title="No low-stock items" description="Everything is above the reorder threshold." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top movers</CardTitle>
            <p className="text-sm text-muted-foreground">Highest volume items in the selected period.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {bestSellers.isLoading ? (
              <Skeleton className="h-44" />
            ) : bestSellers.data?.length ? (
              bestSellers.data.map((item, index) => (
                <div key={item.sku} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <div>
                    <div className="font-medium">{index + 1}. {item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.sku}</div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{formatNumber(item.sold)} sold</div>
                    <div>{formatCurrency(item.revenue)}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No movement yet" description="Sales data for this time range has not been recorded yet." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operational notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use the inventory module for item edits and restocks. Sales must go through the atomic RPC so counts never drift.</p>
            <p>Any seller account action still flows through the service-protected edge function, which enforces the last-admin rule.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
