export const roles = ['ADMIN', 'SELLER'] as const;
export type Role = (typeof roles)[number];

export function isAdmin(role?: Role | null) {
  return role === 'ADMIN';
}

export function isSeller(role?: Role | null) {
  return role === 'SELLER';
}

export function homeForRole(role?: Role | null) {
  return role === 'ADMIN' ? '/admin/dashboard' : '/seller';
}
