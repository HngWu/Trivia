import React from 'react';
import { getAdminSession } from '@/lib/auth/actions';
import AdminLoginClient from '@/components/admin/AdminLoginClient';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    return <AdminLoginClient />;
  }

  return (
    <AdminLayoutClient user={session}>
      {children}
    </AdminLayoutClient>
  );
}
