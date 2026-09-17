import React from 'react';
import { getAdminSession } from '@/lib/auth/actions';
import AdminLoginClient from '@/components/admin/AdminLoginClient';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    const defaultEmail = (process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@trivia.local').trim().toLowerCase();
    return <AdminLoginClient defaultEmail={defaultEmail} />;
  }

  return (
    <AdminLayoutClient user={session}>
      {children}
    </AdminLayoutClient>
  );
}
