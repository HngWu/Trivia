import { 
  getTopics, 
  getQuestionCountsByTopic, 
  getQuestionsByTopic, 
  getAllQuestions 
} from '@/lib/actions';
import AdminQuestionsClient from './AdminQuestionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const params = await searchParams;
  const targetTopic = params?.topic || '';

  const [topics, questionCounts, questions] = await Promise.all([
    getTopics(),
    getQuestionCountsByTopic().catch(() => ({} as Record<string, number>)),
    targetTopic ? getQuestionsByTopic(targetTopic) : getAllQuestions(200)
  ]);

  return (
    <AdminQuestionsClient
      initialTopics={topics || []}
      initialQuestionCounts={questionCounts || {}}
      initialTargetTopic={targetTopic}
      initialQuestions={questions || []}
    />
  );
}

