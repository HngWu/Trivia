CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'waiting',
    leader_id UUID,
    current_question_index INT DEFAULT 0,
    topic TEXT
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INT DEFAULT 0,
    available_weights INT[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10],
    is_leader BOOLEAN DEFAULT FALSE
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'text', 'boolean', 'multiple_choice'
    options JSONB, -- Array of strings for multiple choice
    correct_answer TEXT NOT NULL
);

CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    wager INT NOT NULL,
    submitted_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE
);
