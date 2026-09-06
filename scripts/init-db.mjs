import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbPath = process.env.SQLITE_DB_PATH || path.join(rootDir, 'data', 'trivia.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`[init-db] Initializing database at ${dbPath}...`);
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA synchronous = NORMAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA cache_size = -64000;');
db.exec('PRAGMA temp_store = MEMORY;');
db.exec('PRAGMA mmap_size = 268435456;');
db.exec('PRAGMA busy_timeout = 5000;');

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

const hasProvider = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get();
if (!hasProvider) {
  db.prepare("INSERT INTO system_settings (key, value) VALUES ('db_provider', 'sqlite')").run();
}

const usersCount = db.prepare("SELECT count(*) as count FROM users").get().count;
if (usersCount === 0) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync('admin123', salt, 100000, 32, 'sha256').toString('hex');
  db.prepare("INSERT INTO users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)").run(
    crypto.randomUUID(),
    'admin@trivia.local',
    hash,
    salt
  );
}

const seedDataPath = path.join(rootDir, 'src', 'lib', 'db', 'seed-data.json');
if (fs.existsSync(seedDataPath)) {
  const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

  const topicsCount = db.prepare("SELECT count(*) as count FROM topics").get().count;
  if (topicsCount === 0 && Array.isArray(seedData.topics)) {
    const insertTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (id, name, icon, description, example_question) VALUES (?, ?, ?, ?, ?)"
    );
    db.exec('BEGIN TRANSACTION;');
    for (const t of seedData.topics) {
      insertTopic.run(t.id, t.name, t.icon, t.description || '', t.example_question || '');
    }
    db.exec('COMMIT;');
  }

  const questionsCount = db.prepare("SELECT count(*) as count FROM questions").get().count;
  if (questionsCount === 0 && Array.isArray(seedData.questions)) {
    const insertQuestion = db.prepare(
      "INSERT OR IGNORE INTO questions (id, topic, summary, text, type, options, correct_answer, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))"
    );
    db.exec('BEGIN TRANSACTION;');
    for (const q of seedData.questions) {
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
}

const finalTopics = db.prepare("SELECT count(*) as count FROM topics").get().count;
const finalQuestions = db.prepare("SELECT count(*) as count FROM questions").get().count;
console.log(`[init-db] Database successfully initialized with ${finalTopics} topics and ${finalQuestions} questions.`);
db.close();
