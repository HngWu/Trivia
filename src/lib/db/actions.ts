'use server';

import { getSqliteDb } from './sqlite-connection';
import { getActiveProviderName, supabaseProvider, clearProviderCache } from './index';
import { redis } from '../redis';
import { invalidateTopicCache, safeRedisOp } from '../actions';

export async function getDatabaseProviderStatus() {
  const provider = await getActiveProviderName();
  const db = getSqliteDb();
  const topicsCount = (db.prepare('SELECT count(*) as count FROM topics').get() as { count: number }).count;
  const questionsCount = (db.prepare('SELECT count(*) as count FROM questions').get() as { count: number }).count;
  const usersCount = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;

  return {
    provider,
    localStats: {
      topicsCount,
      questionsCount,
      usersCount
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

  clearProviderCache();
  invalidateTopicCache();

  // Invalidate Redis topic cache non-blockingly
  safeRedisOp(() => redis.del('cached_topics'), 300).catch(() => {});

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

    db.exec('BEGIN IMMEDIATE');
    try {
      for (const t of supabaseTopics) {
        insertTopic.run(t.id, t.name, t.icon, t.description || '', t.example_question || '');
      }

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
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }

    invalidateTopicCache();
    safeRedisOp(() => redis.del('cached_topics'), 300).catch(() => {});

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
