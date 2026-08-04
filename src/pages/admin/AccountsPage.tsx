import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/EmptyState';
import { accountSchema } from '../../lib/schemas';
import { invokeAccountAction, listAccounts } from '../../lib/api';
import { useAuth } from '../../context/AuthProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

type AccountValues = z.infer<typeof accountSchema>;

export function AccountsPage() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: listAccounts });
  const form = useForm<AccountValues>({ resolver: zodResolver(accountSchema), defaultValues: { name: '', email: '', password: '', role: 'SELLER' } });

  const createMutation = useMutation({
    mutationFn: invokeAccountAction,
    onSuccess: () => {
      toast.success('Account created');
      accountsQuery.refetch();
      setOpen(false);
      form.reset({ name: '', email: '', password: '', role: 'SELLER' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to create account'),
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => invokeAccountAction({ action: 'delete', profileId }),
    onSuccess: () => {
      toast.success('Account updated');
      accountsQuery.refetch();
      setSelectedId(null);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to update account'),
  });

  return (
    <AppShell title="Account Management" subtitle="Create and disable seller/admin accounts through a service-protected edge function.">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accounts</CardTitle>
          <Button onClick={() => setOpen(true)}>Create account</Button>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          {accountsQuery.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading accounts...</div>
          ) : accountsQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsQuery.data.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.email}</TableCell>
                    <TableCell><Badge variant={account.role === 'ADMIN' ? 'default' : 'secondary'}>{account.role}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={account.is_active && !account.is_deleted ? 'success' : 'warning'}>{account.is_active && !account.is_deleted ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" disabled={account.id === profile?.id} onClick={() => setSelectedId(account.id)}>Deactivate</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="No accounts found" description="Create the first seller or admin account from here." />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>The service function creates the auth user and profile together.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate({ action: 'create', ...values }))}>
            <div className="space-y-2"><Label>Name</Label><Input {...form.register('name')} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...form.register('email')} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" {...form.register('password')} /></div>
            <div className="space-y-2"><Label>Role</Label><Select {...form.register('role')}>
              <option value="SELLER">SELLER</option>
              <option value="ADMIN">ADMIN</option>
            </Select></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate account?</DialogTitle>
            <DialogDescription>The edge function enforces self-delete and last-admin protection before changing status.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selectedId && deleteMutation.mutate(selectedId)} disabled={deleteMutation.isPending}>Deactivate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
