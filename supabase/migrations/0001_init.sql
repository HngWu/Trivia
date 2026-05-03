-- consolidated supabase/migrations/0001_init.sql

-- 1. Create Tables

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'waiting',
    leader_id UUID,
    current_question_index INT DEFAULT 0,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INT DEFAULT 0,
    available_weights INT[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10],
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions pool (Filler Questions)
CREATE TABLE IF NOT EXISTS filler_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'boolean', 'multiple_choice'
    options JSONB, -- Array of strings for multiple choice
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active match questions (Materialized from filler or AI)
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player answers/wagers for active matches
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    wager INT NOT NULL,
    submitted_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE filler_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies (Configured for anonymous public gameplay)

-- Filler Questions: Publicly readable
CREATE POLICY "Public read access for filler_questions" ON filler_questions
    FOR SELECT USING (true);

-- Rooms: Public can create, read, and update
CREATE POLICY "Public can create rooms" ON rooms
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read rooms" ON rooms
    FOR SELECT USING (true);
CREATE POLICY "Public can update rooms" ON rooms
    FOR UPDATE USING (true);

-- Players: Public can join (insert) and see/update players
CREATE POLICY "Public can insert players" ON players
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read players" ON players
    FOR SELECT USING (true);
CREATE POLICY "Public can update players" ON players
    FOR UPDATE USING (true);

-- Questions: Publicly readable and insertable (for materializing rounds)
CREATE POLICY "Public can read questions" ON questions
    FOR SELECT USING (true);
CREATE POLICY "Public can insert questions" ON questions
    FOR INSERT WITH CHECK (true);

-- Answers: Public can insert, read, and update (for submitAnswer logic)
CREATE POLICY "Public can insert answers" ON answers
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read answers" ON answers
    FOR SELECT USING (true);
CREATE POLICY "Public can update answers" ON answers
    FOR UPDATE USING (true);
