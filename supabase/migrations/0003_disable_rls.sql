-- Disable RLS for prototype accessibility
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE filler_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- Alternatively, enable public access if you prefer to keep RLS on
-- DROP POLICY IF EXISTS "Public can insert" ON rooms;
-- CREATE POLICY "Public can insert" ON rooms FOR INSERT WITH CHECK (true);
-- ... (and so on for all tables)

-- The above DISABLE command is the fastest way to unblock development.
