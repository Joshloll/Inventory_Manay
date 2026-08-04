import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthProvider';
import { homeForRole } from '../lib/role';
import { LoginPage } from '../pages/LoginPage';
import { ForcePasswordChangePage } from '../pages/ForcePasswordChangePage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { InventoryPage } from '../pages/admin/InventoryPage';
import { AccountsPage } from '../pages/admin/AccountsPage';
import { ActivityLogPage } from '../pages/admin/ActivityLogPage';
import { ReportsPage } from '../pages/admin/ReportsPage';
import { SellerHomePage } from '../pages/seller/SellerHomePage';
import { MySalesPage } from '../pages/seller/MySalesPage';
import { ReceiptPage } from '../pages/seller/ReceiptPage';
import { NotFoundPage } from '../pages/NotFoundPage';

function RoleRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homeForRole(profile.role)} replace />;
}

export function AppRouter() {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/force-password-change" element={<ForcePasswordChangePage />} />
      <Route path="/" element={<RoleRedirect />} />
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/inventory" element={<InventoryPage />} />
        <Route path="/admin/accounts" element={<AccountsPage />} />
        <Route path="/admin/activity-log" element={<ActivityLogPage />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['SELLER']} />}>
        <Route path="/seller" element={<SellerHomePage />} />
        <Route path="/seller/sales" element={<MySalesPage />} />
        <Route path="/seller/receipts/:transactionId" element={<ReceiptPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
