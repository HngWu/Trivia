-- 1. Indexing for Topics
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics (name);

-- 2. Indexing for Questions
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions (topic);
CREATE INDEX IF NOT EXISTS idx_questions_topic_created_at ON questions (topic, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_text ON questions (text); -- Helps with duplicate detection
