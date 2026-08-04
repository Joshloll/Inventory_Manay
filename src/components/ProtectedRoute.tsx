import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { homeForRole, isAdmin } from '../lib/role';
import { useIdleLogout } from '../hooks/useIdleLogout';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Array<'ADMIN' | 'SELLER'> }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  useIdleLogout(Boolean(session));

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading session...</div>;
  }

  if (!session || !profile || !profile.is_active || profile.is_deleted) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />;
  }

  return <Outlet />;
}
