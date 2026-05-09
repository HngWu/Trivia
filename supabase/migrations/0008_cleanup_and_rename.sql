-- 1. Drop unused tables (Active game state is in Redis)
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- 2. Rename filler_questions to questions
ALTER TABLE filler_questions RENAME TO questions;

-- 3. Update the RLS policy name (optional but good for consistency)
ALTER POLICY "Public read access for filler_questions" ON questions RENAME TO "Public read access for questions";

-- 4. Ensure RLS is still enabled (renaming preserves it, but just in case)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
