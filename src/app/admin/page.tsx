import { getDatabaseProviderStatus } from '@/lib/db/actions';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const status = await getDatabaseProviderStatus();
  return <AdminDashboardClient initialStatus={status} />;
}
