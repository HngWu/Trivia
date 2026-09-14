import { getDatabaseProviderStatus, getRedisSessionStatus } from '@/lib/db/actions';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [dbStatus, redisStatus] = await Promise.all([
    getDatabaseProviderStatus(),
    getRedisSessionStatus(),
  ]);

  return <AdminDashboardClient initialStatus={dbStatus} initialRedisStatus={redisStatus} />;
}
