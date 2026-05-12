import { getTopics } from '@/lib/actions';
import HomeClient from '@/components/home/HomeClient';

export const dynamic = 'force-dynamic'; // Ensure we always get fresh data if needed, or use revalidate

export default async function Home() {
  const topics = await getTopics();
  
  return <HomeClient initialTopics={topics || []} />;
}
