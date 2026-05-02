-- Setup script to ensure tables exist and have filler questions
-- Run this in the Supabase SQL Editor

-- 1. Create Tables if they don't exist
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'waiting',
    leader_id UUID,
    current_question_index INT DEFAULT 0,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INT DEFAULT 0,
    available_weights INT[] DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10],
    is_leader BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filler_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    summary TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL
);

-- 2. Insert Filler Questions (10 per topic)
INSERT INTO filler_questions (topic, summary, text, type, options, correct_answer) VALUES
-- HISTORY
('history', 'Ancient Egypt', 'Which pharaoh''s tomb was discovered intact in 1922?', 'multiple_choice', '["Ramses II", "Tutankhamun", "Akhenaten", "Seti I"]', 'Tutankhamun'),
('history', 'French Revolution', 'In which year did the French Revolution begin?', 'text', null, '1789'),
('history', 'World War II', 'The D-Day landings took place in which French region?', 'multiple_choice', '["Brittany", "Provence", "Normandy", "Alsace"]', 'Normandy'),
('history', 'Cold War', 'The Berlin Wall fell in which year?', 'text', null, '1989'),
('history', 'Roman Empire', 'Who was the first Emperor of Rome?', 'multiple_choice', '["Julius Caesar", "Augustus", "Nero", "Tiberius"]', 'Augustus'),
('history', 'American Civil War', 'The Emancipation Proclamation was issued by which President?', 'text', null, 'Abraham Lincoln'),
('history', 'Magna Carta', 'In which year was the Magna Carta signed?', 'multiple_choice', '["1066", "1215", "1492", "1588"]', '1215'),
('history', 'Viking Age', 'Leif Erikson is credited with reaching which continent before Columbus?', 'text', null, 'North America'),
('history', 'Industrial Revolution', 'Who invented the modern steam engine?', 'multiple_choice', '["James Watt", "Thomas Edison", "Eli Whitney", "Robert Fulton"]', 'James Watt'),
('history', 'Aztec Empire', 'What was the capital city of the Aztec Empire?', 'text', null, 'Tenochtitlan'),
-- SCIENCE
('science', 'Biology', 'What is the "powerhouse" of the cell?', 'multiple_choice', '["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"]', 'Mitochondria'),
('science', 'Physics', 'What is the speed of light in a vacuum (approx)?', 'text', null, '299,792,458 m/s'),
('science', 'Chemistry', 'What is the chemical symbol for Gold?', 'text', null, 'Au'),
('science', 'Astronomy', 'Which planet is known as the Red Planet?', 'multiple_choice', '["Venus", "Mars", "Jupiter", "Saturn"]', 'Mars'),
('science', 'Geology', 'What type of rock is formed from cooled magma?', 'multiple_choice', '["Sedimentary", "Metamorphic", "Igneous", "Quartz"]', 'Igneous'),
('science', 'Human Body', 'How many bones are in the adult human body?', 'text', null, '206'),
('science', 'Mathematics', 'What is the square root of 144?', 'text', null, '12'),
('science', 'Botany', 'What process do plants use to convert sunlight into energy?', 'text', null, 'Photosynthesis'),
('science', 'Elements', 'What is the most abundant gas in Earth''s atmosphere?', 'multiple_choice', '["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"]', 'Nitrogen'),
('science', 'Evolution', 'Who wrote "On the Origin of Species"?', 'text', null, 'Charles Darwin'),
-- POP CULTURE
('pop-culture', 'Movies', 'Which movie won the first ever Academy Award for Best Picture?', 'multiple_choice', '["Wings", "Sunrise", "The Jazz Singer", "Metropolis"]', 'Wings'),
('pop-culture', 'Music', 'Who is known as the "King of Pop"?', 'text', null, 'Michael Jackson'),
('pop-culture', 'TV Shows', 'In "Friends", how many seasons were there?', 'text', null, '10'),
('pop-culture', 'Gaming', 'What is the best-selling video game of all time?', 'multiple_choice', '["Tetris", "Minecraft", "GTA V", "Wii Sports"]', 'Minecraft'),
('pop-culture', 'Comics', 'What is Batman''s real name?', 'text', null, 'Bruce Wayne'),
('pop-culture', 'Streaming', 'Which Netflix series features the character Eleven?', 'text', null, 'Stranger Things'),
('pop-culture', 'Animation', 'What was the first feature-length animated movie?', 'multiple_choice', '["Pinocchio", "Snow White and the Seven Dwarfs", "Dumbo", "Bambi"]', 'Snow White and the Seven Dwarfs'),
('pop-culture', 'Internet', 'In what year was YouTube founded?', 'multiple_choice', '["2003", "2004", "2005", "2006"]', '2005'),
('pop-culture', 'Harry Potter', 'What is the name of Harry Potter''s owl?', 'text', null, 'Hedwig'),
('pop-culture', 'Star Wars', 'Who is Luke Skywalker''s father?', 'text', null, 'Darth Vader'),
-- GEOGRAPHY
('geography', 'Continents', 'Which is the largest continent by land area?', 'multiple_choice', '["Africa", "North America", "Asia", "Antarctica"]', 'Asia'),
('geography', 'Oceans', 'What is the deepest point in the world''s oceans?', 'text', null, 'Mariana Trench'),
('geography', 'Countries', 'Which country has the largest population?', 'text', null, 'India'),
('geography', 'Rivers', 'What is the longest river in the world?', 'multiple_choice', '["Amazon", "Nile", "Yangtze", "Mississippi"]', 'Nile'),
('geography', 'Capitals', 'What is the capital city of Australia?', 'multiple_choice', '["Sydney", "Melbourne", "Canberra", "Perth"]', 'Canberra'),
('geography', 'Mountains', 'What is the tallest mountain in the world?', 'text', null, 'Mount Everest'),
('geography', 'Deserts', 'Which is the largest hot desert in the world?', 'text', null, 'Sahara'),
('geography', 'Islands', 'Which island country is known as the "Land of the Rising Sun"?', 'text', null, 'Japan'),
('geography', 'Lakes', 'Which is the largest freshwater lake by surface area?', 'multiple_choice', '["Lake Victoria", "Lake Superior", "Caspian Sea", "Lake Baikal"]', 'Lake Superior'),
('geography', 'United States', 'How many states are in the USA?', 'text', null, '50'),
-- SPORTS
('sports', 'Olympics', 'How often are the Summer Olympics held?', 'multiple_choice', '["Every 2 years", "Every 4 years", "Every 5 years", "Every year"]', 'Every 4 years'),
('sports', 'Soccer', 'Which country has won the most FIFA World Cups?', 'text', null, 'Brazil'),
('sports', 'Basketball', 'How many players are on a standard basketball team on the court?', 'text', null, '5'),
('sports', 'Tennis', 'Which tournament is played on grass?', 'multiple_choice', '["French Open", "US Open", "Wimbledon", "Australian Open"]', 'Wimbledon'),
('sports', 'Golf', 'What is the term for scoring one under par on a hole?', 'text', null, 'Birdie'),
('sports', 'Baseball', 'How many innings are in a standard professional baseball game?', 'text', null, '9'),
('sports', 'Boxing', 'Who is known as "The Greatest"?', 'text', null, 'Muhammad Ali'),
('sports', 'Formula 1', 'Which driver has the most F1 World Championships (tied)?', 'multiple_choice', '["Michael Schumacher", "Lewis Hamilton", "Ayrton Senna", "Sebastian Vettel"]', 'Lewis Hamilton'),
('sports', 'Hockey', 'What is the object hit in ice hockey?', 'text', null, 'Puck'),
('sports', 'American Football', 'How many points is a touchdown worth?', 'text', null, '6')
ON CONFLICT DO NOTHING;

-- 3. Enable Realtime for rooms and players
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
