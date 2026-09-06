import { Topic, Question } from '../types/game';

export interface DatabaseProvider {
  name: 'sqlite' | 'supabase';
  getTopics(): Promise<Topic[]>;
  addTopic(topic: Topic): Promise<void>;
  updateTopic(id: string, updates: Partial<Topic>): Promise<void>;
  deleteTopic(id: string): Promise<void>;
  getQuestionsByTopic(topicId: string): Promise<Question[]>;
  addQuestions(questions: Question[]): Promise<{ count: number; message: string }>;
  updateQuestion(id: string, updates: Partial<Question>): Promise<void>;
  deleteQuestion(id: string): Promise<void>;
  getQuestionsForTopic(topicId: string, count: number): Promise<Question[]>;
  getQuestionCountsByTopic(): Promise<Record<string, number>>;
  getAllQuestions(limit?: number): Promise<Question[]>;
}
