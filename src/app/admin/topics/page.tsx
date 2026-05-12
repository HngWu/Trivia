import { getTopics } from '@/lib/actions';
import AdminTopicsClient from './AdminTopicsClient';

export const dynamic = 'force-dynamic';

export default async function AdminTopicsPage() {
  const topics = await getTopics();
  
  return <AdminTopicsClient initialTopics={topics || []} />;
}
