import { NavLink } from 'react-router-dom';
import { BarChart3, Boxes, FileText, LogOut, Receipt, Settings2, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthProvider';
import { cn } from '../../lib/utils';

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/accounts', label: 'Accounts', icon: UserCog },
  { to: '/admin/activity-log', label: 'Activity Log', icon: FileText },
  { to: '/admin/reports', label: 'Reports', icon: Receipt },
];

const sellerNav = [
  { to: '/seller', label: 'Inventory', icon: Boxes },
  { to: '/seller/sales', label: 'My Sales', icon: Receipt },
];

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navItems = profile?.role === 'ADMIN' ? adminNav : sellerNav;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b bg-card/90 backdrop-blur lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex h-full flex-col gap-6 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Inventory Manay</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">School Supplies</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {profile?.name} · {profile?.role}
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                      isActive ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            Accountability is enforced by RLS, RPCs, and edge functions. Frontend checks only improve the UX.
          </div>
          <button
            type="button"
            onClick={async () => signOut()}
            className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{profile?.role}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <Settings2 className="mr-2 inline h-4 w-4" />
              Supabase-backed and role-protected
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
