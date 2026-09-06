import React from 'react';
import { getAdminUsers, getAdminSession } from '@/lib/auth/actions';
import UserManager from '@/components/admin/UserManager';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin');
  }

  const users = await getAdminUsers();

  return <UserManager initialUsers={users} currentUserId={session.id} />;
}
