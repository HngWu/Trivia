# Local SQLite Database, Database Toggle & Local Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a local SQLite database for topics, questions, and settings; provide a toggle in Admin mode to switch dynamically between SQLite and Supabase; and transition authentication to local-only using salted PBKDF2 hashing and signed session cookies.

**Architecture:** A `DatabaseProvider` interface backed by `SqliteDatabaseProvider` (built on Node.js 22's `node:sqlite` with WAL mode) and `SupabaseDatabaseProvider`. A `getDatabase()` router reads the active provider setting stored in SQLite `system_settings`. An Admin UI toggle allows instant switching and triggers Redis cache invalidation. Local authentication uses Node `crypto` PBKDF2 hashing and HMAC-signed HTTP-only cookies, verified via Server Actions.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Node.js 22 built-in `node:sqlite` (`DatabaseSync`), Node.js `node:crypto`, Upstash Redis, Supabase SSR/JS (retained for toggle and import).

---

### Task 1: SQLite Database Engine, Connection & Schema Setup

**Files:**
- Create: `src/lib/db/sqlite-connection.ts`
- Create: `src/lib/db/seed-data.ts`
- Test: `tests/db_sqlite_init.test.ts`

- [ ] **Step 1: Write unit test for SQLite initialization and table creation**

Create `tests/db_sqlite_init.test.ts`:
```typescript
/**
 * @jest-environment node
 */
import { getSqliteDb, closeSqliteDb, resetSqliteDbForTesting } from '@/lib/db/sqlite-connection';

describe('SQLite Database Initialization', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('creates tables and sets WAL mode', () => {
    const db = getSqliteDb();
    expect(db).toBeDefined();

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('questions');
    expect(tableNames).toContain('system_settings');
    expect(tableNames).toContain('users');
  });

  it('seeds default settings and default admin user if empty', () => {
    const db = getSqliteDb();
    const settings = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    expect(settings?.value).toBe('sqlite');

    const adminUser = db.prepare("SELECT email FROM users WHERE email = 'admin@trivia.local'").get() as { email: string } | undefined;
    expect(adminUser?.email).toBe('admin@trivia.local');

    const topicsCount = db.prepare("SELECT count(*) as count FROM topics").get() as { count: number };
    expect(topicsCount.count).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/jest/bin/jest.js tests/db_sqlite_init.test.ts`
Expected: FAIL (Cannot find module `@/lib/db/sqlite-connection`)

- [ ] **Step 3: Create `src/lib/db/seed-data.ts` and `src/lib/db/sqlite-connection.ts`**

Create `src/lib/db/seed-data.ts` containing default topics and questions from `supabase/migrations/0002_data.sql`:
```typescript
import { Topic, Question } from '../types/game';

export const DEFAULT_TOPICS: Topic[] = [
  { id: 'history', name: 'History', icon: '📜', description: 'Travel through time and test your knowledge of ancient civilizations, world wars, and historical figures.', example_question: 'Who was the first emperor of Rome?' },
  { id: 'science', name: 'Science', icon: '🧪', description: 'Explore the mysteries of the universe, from biology and chemistry to physics and astronomy.', example_question: 'What is the chemical symbol for Gold?' },
  { id: 'pop-culture', name: 'Pop Culture', icon: '🎬', description: 'Movies, music, celebrities, and trends. Stay up to date with the latest and greatest in entertainment.', example_question: 'Which movie won the first ever Oscar for Best Picture?' },
  { id: 'geography', name: 'Geography', icon: '🌍', description: 'Discover the world! From mountain ranges and rivers to countries and capitals.', example_question: 'Which country has the most natural lakes?' },
  { id: 'sports', name: 'Sports', icon: '⚽', description: 'For the ultimate fans. Test your knowledge on teams, athletes, and legendary sports moments.', example_question: 'Which athlete has won the most Olympic gold medals?' },
  { id: 'art', name: 'Art', icon: '🎨', description: 'Appreciate the masterpieces! Famous paintings, artists, and art movements.', example_question: 'Who painted the Mona Lisa?' },
  { id: 'music', name: 'Music', icon: '🎵', description: 'Feel the rhythm! Questions about musical genres, instruments, and famous musicians.', example_question: 'Which composer wrote the Ninth Symphony?' },
  { id: 'movies', name: 'Movies', icon: '🎬', description: 'Lights, camera, action! Test your knowledge on cinema, actors, and directors.', example_question: 'Which film won the first Academy Award for Best Picture?' },
  { id: 'badminton', name: 'Badminton', icon: '🏸', description: 'Smash your way through history, rules, and legendary players like Lin Dan and Lee Chong Wei.', example_question: 'How many feathers are in a standard shuttlecock?' },
  { id: 'mobile legends', name: 'Mobile Legends', icon: '🎮', description: 'Welcome to the Land of Dawn! Test your knowledge on heroes, items, and epic MLBB esports moments.', example_question: 'Which hero is known as the "Son of the Dragon"?' },
  { id: 'wild rift', name: 'Wild Rift', icon: '💎', description: 'Master the Rift! Test your knowledge on LoL: Wild Rift champions, runes, and tactical teamplay.', example_question: 'Which champion has the ultimate ability "Enchanted Crystal Arrow"?' },
  { id: 'custom', name: 'Custom', icon: '✨', description: 'Want something specific? Type in any topic and our AI will generate a unique battle for you.', example_question: 'E.g., 90s Hip Hop, Quantum Mechanics, or Cooking Basics.' }
];

export const DEFAULT_QUESTIONS: Question[] = [
  { id: 'q-seed-1', topic: 'history', summary: 'Ancient Egypt', text: "Which pharaoh's tomb was discovered nearly intact in 1922?", type: 'text', options: null, correct_answer: 'Tutankhamun', explanation: "The discovery of King Tut's tomb is one of the most famous archaeological events." },
  { id: 'q-seed-2', topic: 'history', summary: 'Rome', text: 'Who was the first Emperor of the Roman Empire?', type: 'text', options: null, correct_answer: 'Augustus', explanation: 'Born Octavian, he became the first emperor in 27 BC.' },
  { id: 'q-seed-3', topic: 'history', summary: 'Cold War', text: 'In which year did the Berlin Wall fall?', type: 'text', options: null, correct_answer: '1989', explanation: 'The fall of the wall symbolized the end of the Cold War.' },
  { id: 'q-seed-4', topic: 'history', summary: 'French Revolution', text: 'Who was the Queen of France during the French Revolution?', type: 'text', options: null, correct_answer: 'Marie Antoinette', explanation: 'She was executed by guillotine in 1793.' },
  { id: 'q-seed-5', topic: 'history', summary: 'US History', text: 'In what year was the US Declaration of Independence signed?', type: 'text', options: null, correct_answer: '1776', explanation: 'The Second Continental Congress adopted it on July 4, 1776.' },
  { id: 'q-seed-6', topic: 'science', summary: 'Chemistry', text: 'What is the chemical symbol for Gold?', type: 'text', options: null, correct_answer: 'Au', explanation: 'Derived from the Latin word "Aurum".' },
  { id: 'q-seed-7', topic: 'science', summary: 'Physics', text: 'Who developed the Theory of General Relativity?', type: 'text', options: null, correct_answer: 'Albert Einstein', explanation: 'One of the two pillars of modern physics.' },
  { id: 'q-seed-8', topic: 'science', summary: 'Biology', text: 'What is the powerhouse of the cell?', type: 'text', options: null, correct_answer: 'Mitochondria', explanation: 'They generate most of the cell supply of ATP.' },
  { id: 'q-seed-9', topic: 'pop-culture', summary: 'Music', text: 'Who is known as the "King of Pop"?', type: 'text', options: null, correct_answer: 'Michael Jackson', explanation: 'One of the most significant cultural figures of the 20th century.' },
  { id: 'q-seed-10', topic: 'geography', summary: 'Landmarks', text: 'In which city is the Eiffel Tower located?', type: 'text', options: null, correct_answer: 'Paris', explanation: 'It is one of the most recognizable landmarks in the world.' }
];
```

Create `src/lib/db/sqlite-connection.ts`:
```typescript
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DEFAULT_TOPICS, DEFAULT_QUESTIONS } from './seed-data';

let instance: DatabaseSync | null = null;
let dbPathOverride: string | null = null;

export function setDbPathOverride(customPath: string | null) {
  dbPathOverride = customPath;
  if (instance) {
    try { instance.close(); } catch { /* ignore */ }
    instance = null;
  }
}

export function resetSqliteDbForTesting() {
  setDbPathOverride(':memory:');
}

export function getSqliteDb(): DatabaseSync {
  if (instance) return instance;

  const targetPath = dbPathOverride || path.join(process.cwd(), 'data', 'trivia.db');

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT,
      example_question TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      summary TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
    CREATE INDEX IF NOT EXISTS idx_questions_text ON questions(text);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')) NOT NULL
    );
  `);

  // Seed default settings
  const hasProvider = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get();
  if (!hasProvider) {
    db.prepare("INSERT INTO system_settings (key, value) VALUES ('db_provider', 'sqlite')").run();
  }

  // Seed default admin user (admin@trivia.local / admin123)
  const usersCount = (db.prepare("SELECT count(*) as count FROM users").get() as { count: number }).count;
  if (usersCount === 0) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 32, 'sha256').toString('hex');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), 'admin@trivia.local', hash, salt);
  }

  // Seed default topics and questions
  const topicsCount = (db.prepare("SELECT count(*) as count FROM topics").get() as { count: number }).count;
  if (topicsCount === 0) {
    const insertTopic = db.prepare(`
      INSERT OR IGNORE INTO topics (id, name, icon, description, example_question)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const t of DEFAULT_TOPICS) {
      insertTopic.run(t.id, t.name, t.icon, t.description || '', t.example_question || '');
    }

    const insertQuestion = db.prepare(`
      INSERT OR IGNORE INTO questions (id, topic, summary, text, type, options, correct_answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const q of DEFAULT_QUESTIONS) {
      insertQuestion.run(
        q.id,
        q.topic || 'history',
        q.summary,
        q.text,
        q.type,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer,
        q.explanation || ''
      );
    }
  }

  instance = db;
  return instance;
}

export function closeSqliteDb() {
  if (instance) {
    try { instance.close(); } catch { /* ignore */ }
    instance = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/db_sqlite_init.test.ts`
Expected: PASS

---

### Task 2: Provider Abstraction (`DatabaseProvider`, `SqliteDatabaseProvider`, `SupabaseDatabaseProvider`)

**Files:**
- Create: `src/lib/db/types.ts`
- Create: `src/lib/db/sqlite.ts`
- Create: `src/lib/db/supabase.ts`
- Create: `src/lib/db/index.ts`
- Test: `tests/db_provider.test.ts`

- [ ] **Step 1: Write unit test for `DatabaseProvider` operations**

Create `tests/db_provider.test.ts`:
```typescript
/**
 * @jest-environment node
 */
import { SqliteDatabaseProvider } from '@/lib/db/sqlite';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';
import { Topic, Question } from '@/lib/types/game';

describe('SqliteDatabaseProvider', () => {
  let provider: SqliteDatabaseProvider;

  beforeEach(() => {
    resetSqliteDbForTesting();
    provider = new SqliteDatabaseProvider();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('retrieves topics', async () => {
    const topics = await provider.getTopics();
    expect(topics.length).toBeGreaterThanOrEqual(10);
    expect(topics.some(t => t.id === 'history')).toBe(true);
  });

  it('adds, updates, and deletes a topic', async () => {
    const testTopic: Topic = {
      id: 'test-topic',
      name: 'Test Topic',
      icon: '🧪',
      description: 'Testing',
      example_question: 'Is this a test?'
    };

    await provider.addTopic(testTopic);
    let topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')?.name).toBe('Test Topic');

    await provider.updateTopic('test-topic', { name: 'Updated Topic' });
    topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')?.name).toBe('Updated Topic');

    await provider.deleteTopic('test-topic');
    topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')).toBeUndefined();
  });

  it('manages questions and handles duplicate detection', async () => {
    const questions: Question[] = [
      {
        id: '',
        topic: 'history',
        summary: 'Test Q',
        text: 'Unique Test Question 12345?',
        type: 'text',
        options: null,
        correct_answer: 'Yes',
        explanation: 'Test exp'
      }
    ];

    const res1 = await provider.addQuestions(questions);
    expect(res1.count).toBe(1);

    // Duplicate submission should be filtered
    const res2 = await provider.addQuestions(questions);
    expect(res2.count).toBe(0);

    const retrieved = await provider.getQuestionsByTopic('history');
    const match = retrieved.find(q => q.text === 'Unique Test Question 12345?');
    expect(match).toBeDefined();

    if (match) {
      await provider.updateQuestion(match.id, { correct_answer: 'Absolutely' });
      const updatedList = await provider.getQuestionsByTopic('history');
      expect(updatedList.find(q => q.id === match.id)?.correct_answer).toBe('Absolutely');

      await provider.deleteQuestion(match.id);
      const finalList = await provider.getQuestionsByTopic('history');
      expect(finalList.find(q => q.id === match.id)).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/jest/bin/jest.js tests/db_provider.test.ts`
Expected: FAIL (Cannot find module `@/lib/db/sqlite`)

- [ ] **Step 3: Implement `types.ts`, `sqlite.ts`, `supabase.ts`, and `index.ts`**

Create `src/lib/db/types.ts`:
```typescript
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
}
```

Create `src/lib/db/sqlite.ts`:
```typescript
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
    const rows = db.prepare('SELECT id, name, icon, description, example_question FROM topics ORDER BY name ASC').all() as Topic[];
    return rows;
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
}
```

Create `src/lib/db/supabase.ts`:
```typescript
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
}
```

Create `src/lib/db/index.ts`:
```typescript
import { DatabaseProvider } from './types';
import { SqliteDatabaseProvider } from './sqlite';
import { SupabaseDatabaseProvider } from './supabase';
import { getSqliteDb } from './sqlite-connection';

const sqliteProvider = new SqliteDatabaseProvider();
const supabaseProvider = new SupabaseDatabaseProvider();

export async function getActiveProviderName(): Promise<'sqlite' | 'supabase'> {
  try {
    const db = getSqliteDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    return (row?.value === 'supabase') ? 'supabase' : 'sqlite';
  } catch (error) {
    console.error('Failed to read db_provider setting, defaulting to sqlite:', error);
    return 'sqlite';
  }
}

export async function getDatabase(): Promise<DatabaseProvider> {
  const active = await getActiveProviderName();
  if (active === 'supabase') {
    return supabaseProvider;
  }
  return sqliteProvider;
}

export { sqliteProvider, supabaseProvider };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/db_provider.test.ts`
Expected: PASS

---

### Task 3: Database Provider Toggle Actions & Supabase Sync Tool

**Files:**
- Create: `src/lib/db/actions.ts`
- Test: `tests/db_actions.test.ts`

- [ ] **Step 1: Write unit test for provider toggle and settings**

Create `tests/db_actions.test.ts`:
```typescript
/**
 * @jest-environment node
 */
import { getDatabaseProviderStatus, switchDatabaseProvider } from '@/lib/db/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

jest.mock('@/lib/redis', () => ({
  redis: {
    del: jest.fn().mockResolvedValue(1)
  }
}));

describe('Database Provider Actions', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('reads current provider and switches between sqlite and supabase', async () => {
    let status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('sqlite');

    await switchDatabaseProvider('supabase');
    status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('supabase');

    await switchDatabaseProvider('sqlite');
    status = await getDatabaseProviderStatus();
    expect(status.provider).toBe('sqlite');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/jest/bin/jest.js tests/db_actions.test.ts`
Expected: FAIL (Cannot find module `@/lib/db/actions`)

- [ ] **Step 3: Implement `src/lib/db/actions.ts`**

Create `src/lib/db/actions.ts`:
```typescript
'use server';

import { getSqliteDb } from './sqlite-connection';
import { getActiveProviderName, sqliteProvider, supabaseProvider } from './index';
import { redis } from '../redis';

export async function getDatabaseProviderStatus() {
  const provider = await getActiveProviderName();
  const db = getSqliteDb();
  const topicsCount = (db.prepare('SELECT count(*) as count FROM topics').get() as { count: number }).count;
  const questionsCount = (db.prepare('SELECT count(*) as count FROM questions').get() as { count: number }).count;

  return {
    provider,
    localStats: {
      topicsCount,
      questionsCount
    }
  };
}

export async function switchDatabaseProvider(provider: 'sqlite' | 'supabase') {
  const db = getSqliteDb();
  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('db_provider', ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(provider);

  // Invalidate Redis topic cache
  try {
    await redis.del('cached_topics');
  } catch (error) {
    console.error('Redis cache invalidation warning:', error);
  }

  return { success: true, provider };
}

export async function importFromSupabaseToSqlite() {
  try {
    const [supabaseTopics, supabaseQuestions] = await Promise.all([
      supabaseProvider.getTopics(),
      (async () => {
        const topics = await supabaseProvider.getTopics();
        const allQ = await Promise.all(topics.map(t => supabaseProvider.getQuestionsByTopic(t.id)));
        return allQ.flat();
      })()
    ]);

    const db = getSqliteDb();

    // Insert topics
    const insertTopic = db.prepare(`
      INSERT INTO topics (id, name, icon, description, example_question)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        icon = excluded.icon,
        description = excluded.description,
        example_question = excluded.example_question
    `);

    for (const t of supabaseTopics) {
      insertTopic.run(t.id, t.name, t.icon, t.description || '', t.example_question || '');
    }

    // Insert questions
    const insertQuestion = db.prepare(`
      INSERT INTO questions (id, topic, summary, text, type, options, correct_answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        topic = excluded.topic,
        summary = excluded.summary,
        text = excluded.text,
        type = excluded.type,
        options = excluded.options,
        correct_answer = excluded.correct_answer,
        explanation = excluded.explanation
    `);

    for (const q of supabaseQuestions) {
      insertQuestion.run(
        q.id,
        q.topic || 'general',
        q.summary,
        q.text,
        q.type,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer,
        q.explanation || 'No explanation provided.'
      );
    }

    try {
      await redis.del('cached_topics');
    } catch { /* ignore */ }

    return {
      success: true,
      topicsCount: supabaseTopics.length,
      questionsCount: supabaseQuestions.length,
      message: `Successfully imported ${supabaseTopics.length} topics and ${supabaseQuestions.length} questions from Supabase.`
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      topicsCount: 0,
      questionsCount: 0,
      message: `Failed to import from Supabase: ${err.message}`
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/db_actions.test.ts`
Expected: PASS

---

### Task 4: Local Authentication Engine & Server Actions

**Files:**
- Create: `src/lib/auth/crypto.ts`
- Create: `src/lib/auth/actions.ts`
- Test: `tests/local_auth.test.ts`

- [ ] **Step 1: Write unit test for authentication crypto and session signing**

Create `tests/local_auth.test.ts`:
```typescript
/**
 * @jest-environment node
 */
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '@/lib/auth/crypto';

describe('Local Authentication Crypto', () => {
  it('hashes and verifies passwords with salt', () => {
    const password = 'SecretPassword123!';
    const { hash, salt } = hashPassword(password);

    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(verifyPassword(password, hash, salt)).toBe(true);
    expect(verifyPassword('WrongPassword', hash, salt)).toBe(false);
  });

  it('creates and verifies valid HMAC session tokens', () => {
    const secret = 'super-secret-key-for-test-32-chars!';
    const userId = 'user-123-uuid';
    const token = createSessionToken(userId, secret, 3600);

    const verified = verifySessionToken(token, secret);
    expect(verified).toBe(userId);
  });

  it('rejects tampered or expired tokens', () => {
    const secret = 'super-secret-key-for-test-32-chars!';
    const userId = 'user-123-uuid';
    const token = createSessionToken(userId, secret, -10); // expired

    expect(verifySessionToken(token, secret)).toBeNull();

    const validToken = createSessionToken(userId, secret, 3600);
    const tampered = validToken.slice(0, -4) + 'abcd';
    expect(verifySessionToken(tampered, secret)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/jest/bin/jest.js tests/local_auth.test.ts`
Expected: FAIL (Cannot find module `@/lib/auth/crypto`)

- [ ] **Step 3: Implement `src/lib/auth/crypto.ts` and `src/lib/auth/actions.ts`**

Create `src/lib/auth/crypto.ts`:
```typescript
import crypto from 'node:crypto';

const ITERATIONS = 100000;
const KEY_LEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

export function createSessionToken(userId: string, secret: string, maxAgeSeconds: number = 7 * 24 * 3600): string {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${userId}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifySessionToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, expiresAtStr, signature] = decoded.split(':');
    if (!userId || !expiresAtStr || !signature) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const expectedSignature = crypto.createHmac('sha256', secret).update(`${userId}:${expiresAtStr}`).digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));

    return isValid ? userId : null;
  } catch {
    return null;
  }
}
```

Create `src/lib/auth/actions.ts`:
```typescript
'use server';

import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getSqliteDb } from '../db/sqlite-connection';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from './crypto';

const COOKIE_NAME = 'trivia_admin_session';

function getSessionSecret(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  const db = getSqliteDb();
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'session_secret'").get() as { value: string } | undefined;
  if (row) return row.value;

  const generated = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO system_settings (key, value) VALUES ('session_secret', ?)").run(generated);
  return generated;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
}

export async function adminLogin(formData: { email: string; password: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const db = getSqliteDb();
    const user = db.prepare('SELECT id, email, password_hash, salt FROM users WHERE lower(email) = ?').get(email) as UserRow | undefined;

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const secret = getSessionSecret();
    const token = createSessionToken(user.id, secret);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function adminLogout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

export async function getAdminSession(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = getSessionSecret();
    const userId = verifySessionToken(token, secret);
    if (!userId) return null;

    const db = getSqliteDb();
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as { id: string; email: string } | undefined;
    if (!user) return null;

    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function changeAdminPassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized.' };

  if (!data.newPassword || data.newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const db = getSqliteDb();
  const user = db.prepare('SELECT id, password_hash, salt FROM users WHERE id = ?').get(session.id) as UserRow | undefined;
  if (!user) return { success: false, error: 'User not found.' };

  const isCurrentValid = verifyPassword(data.currentPassword, user.password_hash, user.salt);
  if (!isCurrentValid) {
    return { success: false, error: 'Current password does not match.' };
  }

  const { hash, salt } = hashPassword(data.newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, session.id);

  return { success: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/local_auth.test.ts`
Expected: PASS

---

### Task 5: Refactor Core Actions to use `getDatabase()`

**Files:**
- Modify: `src/lib/actions.ts`
- Modify: `next.config.ts` (add `serverExternalPackages: ['node:sqlite']`)
- Test: `tests/actions_integration.test.ts`

- [ ] **Step 1: Write integration test for `src/lib/actions.ts`**

Create `tests/actions_integration.test.ts`:
```typescript
/**
 * @jest-environment node
 */
import { getTopics, addTopic, deleteTopic } from '@/lib/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  },
  ROOM_TTL: 3600
}));

describe('Actions with Database Provider', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('fetches topics from active provider', async () => {
    const topics = await getTopics();
    expect(topics.length).toBeGreaterThanOrEqual(10);
  });

  it('creates and deletes a topic via actions', async () => {
    await addTopic({
      id: 'action-test-topic',
      name: 'Action Test Topic',
      icon: '🎯'
    });

    const topics = await getTopics();
    expect(topics.find(t => t.id === 'action-test-topic')).toBeDefined();

    await deleteTopic('action-test-topic');
    const updated = await getTopics();
    expect(updated.find(t => t.id === 'action-test-topic')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Update `next.config.ts` to ensure `node:sqlite` is treated as an external server package**

Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"]
};

export default nextConfig;
```

- [ ] **Step 3: Modify `src/lib/actions.ts` to replace direct Supabase calls with `getDatabase()`**

In `src/lib/actions.ts`:
- Import `getDatabase` from `./db`:
  ```typescript
  import { getDatabase } from "./db";
  ```
- Update `createRoom`:
  Replace:
  ```typescript
  const supabase = await createClient();
  const normalizedTopic = topic.toLowerCase();
  const { data: allQuestions } = await supabase.from("questions").select("*").eq("topic", normalizedTopic);
  ```
  With:
  ```typescript
  const db = await getDatabase();
  const normalizedTopic = topic.toLowerCase();
  let questions = await db.getQuestionsForTopic(normalizedTopic, count);
  ```
- Update `getTopics`:
  Replace `const supabase = await createClient(); ...` with:
  ```typescript
  const db = await getDatabase();
  const topics = await db.getTopics();
  ```
- Update `addTopic`, `addQuestions`, `deleteTopic`, `updateTopic`, `deleteQuestion`, `updateQuestion`, `getQuestionsByTopic`:
  Delegate each to `const db = await getDatabase(); await db.<method>(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/jest/bin/jest.js tests/actions_integration.test.ts`
Expected: PASS

---

### Task 6: Update Admin UI with Local Auth, Database Toggle & Sync Tool

**Files:**
- Create: `src/components/admin/DatabaseToggle.tsx`
- Create: `src/components/admin/ChangePasswordModal.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/components/admin/AdminLogin.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create `src/components/admin/DatabaseToggle.tsx`**

Create `src/components/admin/DatabaseToggle.tsx`:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getDatabaseProviderStatus, switchDatabaseProvider } from '@/lib/db/actions';

export default function DatabaseToggle({ onStatusChange }: { onStatusChange?: (msg: string) => void }) {
  const [provider, setProvider] = useState<'sqlite' | 'supabase'>('sqlite');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    getDatabaseProviderStatus().then(status => setProvider(status.provider));
  }, []);

  const handleToggle = async (target: 'sqlite' | 'supabase') => {
    if (target === provider || isUpdating) return;
    setIsUpdating(true);
    try {
      await switchDatabaseProvider(target);
      setProvider(target);
      onStatusChange?.(`Database provider switched to ${target === 'sqlite' ? 'Local SQLite' : 'Cloud Supabase'}`);
    } catch (error) {
      const err = error as Error;
      onStatusChange?.(`Failed to switch database: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center space-x-1 glass p-1 rounded-2xl border-white/10 shadow-inner">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleToggle('sqlite')}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center space-x-1.5 ${
          provider === 'sqlite' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${provider === 'sqlite' ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
        <span>SQLite</span>
      </button>

      <button
        type="button"
        disabled={isUpdating}
        onClick={() => handleToggle('supabase')}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center space-x-1.5 ${
          provider === 'supabase' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${provider === 'supabase' ? 'bg-emerald-500 animate-pulse' : 'bg-transparent'}`} />
        <span>Supabase</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/admin/ChangePasswordModal.tsx`**

Create `src/components/admin/ChangePasswordModal.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import { changeAdminPassword } from '@/lib/auth/actions';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const res = await changeAdminPassword({ currentPassword, newPassword });
    setIsSubmitting(false);

    if (res.success) {
      onSuccess('Password updated successfully.');
      onClose();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass p-6 sm:p-8 rounded-3xl w-full max-w-sm space-y-4 border-white/10 shadow-2xl">
        <h3 className="text-xl font-bold tracking-tight text-foreground">Change Password</h3>
        {error && <div className="p-3 text-xs font-bold text-destructive bg-destructive/10 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-10 glass-input rounded-xl px-4 text-xs font-medium text-foreground"
            required
          />
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 h-10 glass-button rounded-xl text-xs font-bold hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 h-10 glass-button bg-foreground text-background rounded-xl text-xs font-bold hover:bg-white"
            >
              {isSubmitting ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/admin/layout.tsx` to use local auth session & DatabaseToggle**

Update `src/app/admin/layout.tsx`:
- Replace Supabase Auth imports with `getAdminSession`, `adminLogin`, `adminLogout` from `@/lib/auth/actions`.
- Embed `<DatabaseToggle />` in the admin top navigation header.
- Add "Password" button that triggers `ChangePasswordModal`.
- Remove `@supabase/supabase-js` imports.

- [ ] **Step 4: Update `src/components/admin/AdminLogin.tsx` with local auth hints**

Update `src/components/admin/AdminLogin.tsx`:
- Render an understated hint for local development:
  `Default local credentials: admin@trivia.local / admin123`
- Cleanly connect form submit to `onLogin`.

- [ ] **Step 5: Update `src/app/admin/page.tsx` with Database Engine & Sync card**

In `src/app/admin/page.tsx`:
- Add a third dashboard card: "Database Engine & Sync".
- Displays current provider, local topics count, and local questions count.
- Includes an "Import Data from Supabase" button calling `importFromSupabaseToSqlite()`.

---

### Task 7: Full Verification & Build Check

**Files:**
- Run: `node ./node_modules/jest/bin/jest.js` (all unit tests)
- Run: `npm run build` (production build verification)

- [ ] **Step 1: Run all unit and integration tests**

Run: `node ./node_modules/jest/bin/jest.js tests/db_sqlite_init.test.ts tests/db_provider.test.ts tests/db_actions.test.ts tests/local_auth.test.ts tests/actions_integration.test.ts`
Expected: All 5 test suites PASS.

- [ ] **Step 2: Run production Next.js build**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Manual sanity check walkthrough**
1. Visit `/admin`, log in with `admin@trivia.local` / `admin123`.
2. Observe header toggle: click between `SQLite` and `Supabase`.
3. Check `/admin/topics` and `/admin/questions` loads smoothly under SQLite.
4. Click "Import from Supabase" on `/admin` dashboard.
5. Change admin password in `/admin` and verify logout/re-login.
