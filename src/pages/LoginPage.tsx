import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { loginSchema } from '../lib/schemas';
import type { z } from 'zod';
import { useAuth } from '../context/AuthProvider';
import { homeForRole } from '../lib/role';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type LoginValues = z.infer<typeof loginSchema>;

const loginDomain = 'manay.local';

function normalizeLoginIdentifier(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.includes('@') ? trimmed : `${trimmed}@${loginDomain}`;
}

export function LoginPage() {
  const { signIn, profile, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    if (!session || !profile) return;
    if (profile.must_change_password) {
      navigate('/force-password-change', { replace: true });
      return;
    }
    navigate(homeForRole(profile.role), { replace: true });
  }, [navigate, profile, session]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn(normalizeLoginIdentifier(values.email), values.password);
      toast.success('Signed in successfully');
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in');
    }
  });

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Manay school supplies inventory</CardTitle>
          <CardDescription>Use your account identifier and password to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email or username</Label>
              <Input id="email" type="text" autoComplete="username" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-sm text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
              {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
