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

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const defaultDbPath = isServerless
    ? path.join('/tmp', 'trivia.db')
    : path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'trivia.db');

  const targetPath = dbPathOverride || process.env.SQLITE_DB_PATH || defaultDbPath;

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (isServerless && !fs.existsSync(targetPath)) {
      const bundledPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'trivia.db');
      if (fs.existsSync(bundledPath)) {
        try {
          fs.copyFileSync(bundledPath, targetPath);
        } catch (err) {
          console.warn('[SQLite] Could not copy bundled db, will initialize fresh in /tmp:', err);
        }
      }
    }
  }

  const db = new DatabaseSync(targetPath);

  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA cache_size = -64000;');
  db.exec('PRAGMA temp_store = MEMORY;');
  db.exec('PRAGMA mmap_size = 268435456;');
  db.exec('PRAGMA busy_timeout = 5000;');

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
    CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_questions_topic_created ON questions(topic COLLATE NOCASE, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE INDEX IF NOT EXISTS idx_questions_text ON questions(text);
    CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name COLLATE NOCASE);

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

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users(lower(email));
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
    db.exec('BEGIN TRANSACTION;');
    for (const t of DEFAULT_TOPICS) {
      insertTopic.run(t.id, t.name, t.icon, t.description || '', t.example_question || '');
    }
    db.exec('COMMIT;');
  }

  const questionsCount = (db.prepare("SELECT count(*) as count FROM questions").get() as { count: number }).count;
  if (questionsCount === 0) {
    const insertQuestion = db.prepare(`
      INSERT OR IGNORE INTO questions (id, topic, summary, text, type, options, correct_answer, explanation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `);
    db.exec('BEGIN TRANSACTION;');
    for (const q of DEFAULT_QUESTIONS) {
      insertQuestion.run(
        q.id,
        q.topic || 'history',
        q.summary,
        q.text,
        q.type,
        q.options ? JSON.stringify(q.options) : null,
        q.correct_answer,
        q.explanation || '',
        q.created_at || null
      );
    }
    db.exec('COMMIT;');
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
