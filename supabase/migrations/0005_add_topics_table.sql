-- supabase/migrations/0005_add_topics_table.sql

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    example_question TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key to filler_questions
-- Note: existing data in filler_questions uses strings for topic. 
-- We'll keep the column as text but add a FK reference.
ALTER TABLE filler_questions 
ADD CONSTRAINT fk_topic 
FOREIGN KEY (topic) 
REFERENCES topics(id)
ON DELETE CASCADE;

-- Insert existing hardcoded topics
INSERT INTO topics (id, name, icon, description, example_question) VALUES
('history', 'History', '🏛️', 'Travel through time! Questions about ancient civilizations, world wars, and historical figures.', 'Who was the first President of the United States?'),
('science', 'Science', '🔬', 'Explore the universe! From biology to physics, test your scientific knowledge.', 'What is the chemical symbol for gold?'),
('sports', 'Sports', '⚽', 'Get in the game! Knowledge about various sports, famous athletes, and major events.', 'Which country has won the most FIFA World Cups?'),
('geography', 'Geography', '🌎', 'Discover the world! Countries, capitals, landmarks, and cultures.', 'What is the largest country in the world by land area?'),
('art', 'Art', '🎨', 'Appreciate the masterpieces! Famous paintings, artists, and art movements.', 'Who painted the Mona Lisa?'),
('music', 'Music', '🎵', 'Feel the rhythm! Questions about musical genres, instruments, and famous musicians.', 'Which composer wrote the Ninth Symphony?'),
('movies', 'Movies', '🎬', 'Lights, camera, action! Test your knowledge on cinema, actors, and directors.', 'Which film won the first Academy Award for Best Picture?'),
('badminton', 'Badminton', '🏸', 'Smash it! Test your knowledge on badminton rules, legendary players, and major tournaments.', 'Who is known as the "King of Badminton"?'),
('mobile legends', 'Mobile Legends', '🎮', 'Welcome to the Land of Dawn! Test your knowledge on heroes, items, and epic MLBB esports moments.', 'Which hero is known as the "Son of the Dragon"?'),
('wild rift', 'Wild Rift', '💎', 'Master the Rift! Test your knowledge on LoL: Wild Rift champions, runes, and tactical teamplay.', 'Which champion has the ultimate ability "Enchanted Crystal Arrow"?'),
('custom', 'Custom', '✨', 'Want something specific? Type in any topic and our AI will generate a unique battle for you.', 'E.g., 90s Hip Hop, Quantum Mechanics, or Cooking Basics.');
