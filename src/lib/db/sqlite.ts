import crypto from 'node:crypto';
import { DatabaseProvider } from './types';
import { Topic, Question } from '../types/game';
import { getSqliteDb } from './sqlite-connection';

interface DbQuestionRow {
  id: string;
  topic: string;
  summary: string;
  text: string;
  type: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

export class SqliteDatabaseProvider implements DatabaseProvider {
  name = 'sqlite' as const;

  async getTopics(): Promise<Topic[]> {
    const db = getSqliteDb();
    const rows = db.prepare('SELECT id, name, icon, description, example_question FROM topics ORDER BY name ASC').all() as Array<{
      id: string;
      name: string;
      icon: string;
      description: string | null;
      example_question: string | null;
    }>;
    return rows.map(r => ({
      id: String(r.id),
      name: String(r.name),
      icon: String(r.icon),
      description: r.description ? String(r.description) : undefined,
      example_question: r.example_question ? String(r.example_question) : undefined
    }));
  }

  async addTopic(topic: Topic): Promise<void> {
    const db = getSqliteDb();
    db.prepare(`
      INSERT INTO topics (id, name, icon, description, example_question)
      VALUES (?, ?, ?, ?, ?)
    `).run(topic.id, topic.name, topic.icon, topic.description || '', topic.example_question || '');
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<void> {
    const db = getSqliteDb();
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as Topic | undefined;
    if (!existing) throw new Error(`Topic with id ${id} not found`);

    const merged = { ...existing, ...updates };
    db.prepare(`
      UPDATE topics
      SET name = ?, icon = ?, description = ?, example_question = ?
      WHERE id = ?
    `).run(merged.name, merged.icon, merged.description || '', merged.example_question || '', id);
  }

  async deleteTopic(id: string): Promise<void> {
    const db = getSqliteDb();
    db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  }

  async getQuestionsByTopic(topicId: string): Promise<Question[]> {
    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT id, topic, summary, text, type, options, correct_answer, explanation, created_at
      FROM questions
      WHERE topic = ?
      ORDER BY created_at DESC
    `).all(topicId) as DbQuestionRow[];

    return rows.map(r => ({
      id: r.id,
      topic: r.topic,
      summary: r.summary,
      text: r.text,
      type: r.type as Question['type'],
      options: r.options ? JSON.parse(r.options) : null,
      correct_answer: r.correct_answer,
      explanation: r.explanation || undefined
    }));
  }

  async addQuestions(questions: Question[]): Promise<{ count: number; message: string }> {
    const db = getSqliteDb();
    if (questions.length === 0) return { count: 0, message: 'No questions provided.' };

    const texts = questions.map(q => q.text);
    const placeholders = texts.map(() => '?').join(',');
    const existing = db.prepare(`SELECT text FROM questions WHERE text IN (${placeholders})`).all(...texts) as { text: string }[];
    const existingSet = new Set(existing.map(e => e.text));

    const toInsert = questions.filter(q => !existingSet.has(q.text));
    if (toInsert.length === 0) {
      return { count: 0, message: 'All questions in this batch are already in the database.' };
    }

    const stmt = db.prepare(`
      INSERT INTO questions (id, topic, summary, text, type, options, correct_answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const q of toInsert) {
        stmt.run(
          q.id || crypto.randomUUID(),
          q.topic || 'general',
          q.summary,
          q.text,
          q.type,
          q.options ? JSON.stringify(q.options) : null,
          q.correct_answer,
          q.explanation || 'No explanation provided.'
        );
      }
      db.exec('COMMIT');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw error;
    }

    return {
      count: toInsert.length,
      message: `Successfully added ${toInsert.length} new questions.`
    };
  }

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const db = getSqliteDb();
    const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as DbQuestionRow | undefined;
    if (!existing) throw new Error(`Question with id ${id} not found`);

    const optionsStr = updates.options !== undefined 
      ? (updates.options ? JSON.stringify(updates.options) : null)
      : existing.options;

    db.prepare(`
      UPDATE questions
      SET summary = ?, text = ?, type = ?, options = ?, correct_answer = ?, explanation = ?
      WHERE id = ?
    `).run(
      updates.summary !== undefined ? updates.summary : existing.summary,
      updates.text !== undefined ? updates.text : existing.text,
      updates.type !== undefined ? updates.type : existing.type,
      optionsStr,
      updates.correct_answer !== undefined ? updates.correct_answer : existing.correct_answer,
      updates.explanation !== undefined ? updates.explanation : existing.explanation,
      id
    );
  }

  async deleteQuestion(id: string): Promise<void> {
    const db = getSqliteDb();
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  }

  async getQuestionsForTopic(topicId: string, count: number): Promise<Question[]> {
    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT id, topic, summary, text, type, options, correct_answer, explanation
      FROM questions
      WHERE topic = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).all(topicId.toLowerCase(), count) as DbQuestionRow[];

    return rows.map(r => ({
      id: r.id,
      topic: r.topic,
      summary: r.summary,
      text: r.text,
      type: r.type as Question['type'],
      options: r.options ? JSON.parse(r.options) : null,
      correct_answer: r.correct_answer,
      explanation: r.explanation || undefined
    }));
  }

  async getQuestionCountsByTopic(): Promise<Record<string, number>> {
    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT topic, count(*) as count
      FROM questions
      GROUP BY topic
    `).all() as Array<{ topic: string; count: number }>;

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[String(r.topic).toLowerCase()] = Number(r.count);
    }
    return counts;
  }

  async getAllQuestions(limit: number = 100): Promise<Question[]> {
    const db = getSqliteDb();
    const rows = db.prepare(`
      SELECT id, topic, summary, text, type, options, correct_answer, explanation
      FROM questions
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as DbQuestionRow[];

    return rows.map(r => ({
      id: String(r.id),
      topic: String(r.topic),
      summary: String(r.summary),
      text: String(r.text),
      type: r.type as Question['type'],
      options: r.options ? JSON.parse(r.options) : null,
      correct_answer: String(r.correct_answer),
      explanation: r.explanation ? String(r.explanation) : undefined
    }));
  }
}
