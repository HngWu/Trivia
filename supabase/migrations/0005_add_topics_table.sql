-- supabase/migrations/0005_add_topics_table.sql

-- 1. Create topics table
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT,
    example_question TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insert all required topics (including pop-culture used in seed data)
INSERT INTO topics (id, name, icon, description, example_question) VALUES
('history', 'History', '📜', 'Travel through time and test your knowledge of ancient civilizations, world wars, and historical figures.', 'Who was the first emperor of Rome?'),
('science', 'Science', '🧪', 'Explore the mysteries of the universe, from biology and chemistry to physics and astronomy.', 'What is the chemical symbol for Gold?'),
('pop-culture', 'Pop Culture', '🎬', 'Movies, music, celebrities, and trends. Stay up to date with the latest and greatest in entertainment.', 'Which movie won the first ever Oscar for Best Picture?'),
('geography', 'Geography', '🌍', 'Discover the world! From mountain ranges and rivers to countries and capitals.', 'Which country has the most natural lakes?'),
('sports', 'Sports', '⚽', 'For the ultimate fans. Test your knowledge on teams, athletes, and legendary sports moments.', 'Which athlete has won the most Olympic gold medals?'),
('art', 'Art', '🎨', 'Appreciate the masterpieces! Famous paintings, artists, and art movements.', 'Who painted the Mona Lisa?'),
('music', 'Music', '🎵', 'Feel the rhythm! Questions about musical genres, instruments, and famous musicians.', 'Which composer wrote the Ninth Symphony?'),
('movies', 'Movies', '🎬', 'Lights, camera, action! Test your knowledge on cinema, actors, and directors.', 'Which film won the first Academy Award for Best Picture?'),
('badminton', 'Badminton', '🏸', 'Smash your way through history, rules, and legendary players like Lin Dan and Lee Chong Wei.', 'How many feathers are in a standard shuttlecock?'),
('mobile legends', 'Mobile Legends', '🎮', 'Welcome to the Land of Dawn! Test your knowledge on heroes, items, and epic MLBB esports moments.', 'Which hero is known as the "Son of the Dragon"?'),
('wild rift', 'Wild Rift', '💎', 'Master the Rift! Test your knowledge on LoL: Wild Rift champions, runes, and tactical teamplay.', 'Which champion has the ultimate ability "Enchanted Crystal Arrow"?'),
('custom', 'Custom', '✨', 'Want something specific? Type in any topic and our AI will generate a unique battle for you.', 'E.g., 90s Hip Hop, Quantum Mechanics, or Cooking Basics.')
ON CONFLICT (id) DO NOTHING;

-- 3. Add foreign key to filler_questions now that all referenced keys exist
ALTER TABLE filler_questions 
ADD CONSTRAINT fk_topic 
FOREIGN KEY (topic) 
REFERENCES topics(id)
ON DELETE CASCADE;
