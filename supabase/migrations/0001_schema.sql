-- 1. Create Topics Table
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    example_question TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Questions Table (Formerly filler_questions)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'boolean', 'multiple_choice'
    options JSONB, -- Array of strings for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 4. Define RLS Policies

-- Topics
CREATE POLICY "Public read access for topics" ON topics
    FOR SELECT USING (true);

CREATE POLICY "Admin insert access for topics" ON topics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update access for topics" ON topics
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin delete access for topics" ON topics
    FOR DELETE USING (auth.role() = 'authenticated');

-- Questions
CREATE POLICY "Public read access for questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Admin insert access for questions" ON questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update access for questions" ON questions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Admin delete access for questions" ON questions
    FOR DELETE USING (auth.role() = 'authenticated');
