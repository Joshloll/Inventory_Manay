import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthProvider';
import { changePassword, clearPasswordChangeFlag } from '../lib/api';
import { passwordChangeSchema } from '../lib/schemas';
import type { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type PasswordValues = z.infer<typeof passwordChangeSchema>;

export function ForcePasswordChangePage() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordChangeSchema), defaultValues: { password: '' } });

  useEffect(() => {
    if (profile && !profile.must_change_password) {
      navigate('/');
    }
  }, [navigate, profile]);

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await changePassword(password);
      await clearPasswordChangeFlag(profile.id);
      await refreshProfile();
      toast.success('Password updated');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change password');
    }
  });

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
          <CardDescription>The first admin account and any forced reset lands here before the app continues.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
