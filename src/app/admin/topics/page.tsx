import { getTopics, getQuestionCountsByTopic } from '@/lib/actions';
import AdminTopicsClient from './AdminTopicsClient';

export const dynamic = 'force-dynamic';

export default async function AdminTopicsPage() {
  const [topics, questionCounts] = await Promise.all([
    getTopics(),
    getQuestionCountsByTopic().catch(() => ({} as Record<string, number>))
  ]);
  
  return <AdminTopicsClient initialTopics={topics || []} initialQuestionCounts={questionCounts || {}} />;
}
