import { DatabaseProvider } from './types';
import { Topic, Question } from '../types/game';
import { createClient } from '../supabase/server';

export class SupabaseDatabaseProvider implements DatabaseProvider {
  name = 'supabase' as const;

  async getTopics(): Promise<Topic[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('topics').select('*').order('name');
    return data || [];
  }

  async addTopic(topic: Topic): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('topics').insert([topic]);
    if (error) throw error;
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('topics').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteTopic(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) throw error;
  }

  async getQuestionsByTopic(topicId: string): Promise<Question[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('questions').select('*').eq('topic', topicId).order('created_at', { ascending: false });
    return data || [];
  }

  async addQuestions(questions: Question[]): Promise<{ count: number; message: string }> {
    const supabase = await createClient();
    const texts = questions.map(q => q.text);
    const { data: existing } = await supabase.from('questions').select('text').in('text', texts);
    const existingTexts = new Set(existing?.map(e => e.text) || []);

    const sanitized = questions
      .filter(q => !existingTexts.has(q.text))
      .map(q => ({
        topic: q.topic,
        summary: q.summary,
        text: q.text,
        type: q.type,
        options: q.options || null,
        correct_answer: q.correct_answer,
        explanation: q.explanation || 'No explanation provided.'
      }));

    if (sanitized.length === 0) {
      return { count: 0, message: 'All questions in this batch are already in the database.' };
    }

    const { error } = await supabase.from('questions').insert(sanitized);
    if (error) throw error;

    return {
      count: sanitized.length,
      message: `Successfully added ${sanitized.length} new questions.`
    };
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('questions').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteQuestion(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) throw error;
  }

  async getQuestionsForTopic(topicId: string, count: number): Promise<Question[]> {
    const supabase = await createClient();
    const { data } = await supabase.from('questions').select('*').eq('topic', topicId.toLowerCase());
    if (!data || data.length === 0) return [];

    return data
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  async getQuestionCountsByTopic(): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data } = await supabase.from('questions').select('topic');
    if (!data) return {};

    const counts: Record<string, number> = {};
    for (const q of data) {
      const t = String(q.topic).toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }

  async getAllQuestions(limit: number = 100): Promise<Question[]> {
    const supabase = await createClient();
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []) as Question[];
  }
}
