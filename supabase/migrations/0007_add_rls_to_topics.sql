-- supabase/migrations/0007_add_rls_to_topics.sql

-- Enable RLS on topics
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies for topics (consistent with rooms, players, etc.)
CREATE POLICY "Public can create topics" ON topics
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read topics" ON topics
    FOR SELECT USING (true);
CREATE POLICY "Public can update topics" ON topics
    FOR UPDATE USING (true);
