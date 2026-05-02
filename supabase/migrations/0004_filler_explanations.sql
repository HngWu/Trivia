-- Migration to add explanation field to filler_questions and update existing data

ALTER TABLE filler_questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Update HISTORY explanations
UPDATE filler_questions SET explanation = 'Tutankhamun''s tomb was discovered by Howard Carter in the Valley of the Kings, remaining largely untouched for over 3,000 years.' WHERE summary = 'Ancient Egypt';
UPDATE filler_questions SET explanation = 'The French Revolution began with the storming of the Bastille, marking a major turning point in modern history.' WHERE summary = 'French Revolution';
UPDATE filler_questions SET explanation = 'Normandy was chosen for Operation Overlord (D-Day) due to its proximity to England and its strategic beaches.' WHERE summary = 'World War II';
UPDATE filler_questions SET explanation = 'The fall of the Berlin Wall symbolized the end of the Cold War and the eventual reunification of Germany.' WHERE summary = 'Cold War';
UPDATE filler_questions SET explanation = 'Augustus, formerly Octavian, became the first Roman Emperor in 27 BC after the defeat of Mark Antony and Cleopatra.' WHERE summary = 'Roman Empire';
UPDATE filler_questions SET explanation = 'Abraham Lincoln issued the Emancipation Proclamation in 1863, declaring all slaves in Confederate-held territory to be free.' WHERE summary = 'American Civil War';
UPDATE filler_questions SET explanation = 'King John was forced to sign the Magna Carta at Runnymede, establishing the principle that everyone, including the king, is subject to the law.' WHERE summary = 'Magna Carta';
UPDATE filler_questions SET explanation = 'Leif Erikson reached "Vinland" (likely Newfoundland, Canada) around the year 1000, nearly 500 years before Columbus.' WHERE summary = 'Viking Age';
UPDATE filler_questions SET explanation = 'James Watt improved Thomas Newcomen''s steam engine in 1776, which was fundamental to the Industrial Revolution.' WHERE summary = 'Industrial Revolution';
UPDATE filler_questions SET explanation = 'Tenochtitlan was the capital of the Aztec Empire, built on an island in Lake Texcoco in the Valley of Mexico.' WHERE summary = 'Aztec Empire';

-- Update SCIENCE explanations
UPDATE filler_questions SET explanation = 'Mitochondria generate most of the cell''s supply of adenosine triphosphate (ATP), used as a source of chemical energy.' WHERE summary = 'Biology';
UPDATE filler_questions SET explanation = 'The speed of light in a vacuum is exactly 299,792,458 meters per second, a universal physical constant.' WHERE summary = 'Physics';
UPDATE filler_questions SET explanation = 'Au comes from the Latin word for gold, "aurum".' WHERE summary = 'Chemistry';
UPDATE filler_questions SET explanation = 'Mars appears red due to iron oxide (rust) on its surface.' WHERE summary = 'Astronomy';
UPDATE filler_questions SET explanation = 'Igneous rock is formed through the cooling and solidification of magma or lava.' WHERE summary = 'Geology';
UPDATE filler_questions SET explanation = 'The adult human skeleton has 206 bones, while infants are born with around 270 bones that eventually fuse.' WHERE summary = 'Human Body';
UPDATE filler_questions SET explanation = '12 multiplied by 12 equals 144.' WHERE summary = 'Mathematics';
UPDATE filler_questions SET explanation = 'Photosynthesis is used by plants and other organisms to convert light energy into chemical energy.' WHERE summary = 'Botany';
UPDATE filler_questions SET explanation = 'Nitrogen makes up about 78% of Earth''s atmosphere, followed by oxygen at 21%.' WHERE summary = 'Elements';
UPDATE filler_questions SET explanation = 'Charles Darwin published "On the Origin of Species" in 1859, introducing the theory of evolution by natural selection.' WHERE summary = 'Evolution';

-- Update POP CULTURE explanations
UPDATE filler_questions SET explanation = '"Wings" is a 1927 silent film about World War I fighter pilots and is the only silent film to win Best Picture.' WHERE summary = 'Movies';
UPDATE filler_questions SET explanation = 'Michael Jackson earned the title "King of Pop" due to his massive global impact on music, dance, and fashion.' WHERE summary = 'Music';
UPDATE filler_questions SET explanation = '"Friends" ran for 10 seasons on NBC from 1994 to 2004.' WHERE summary = 'TV Shows';
UPDATE filler_questions SET explanation = 'Minecraft has sold over 300 million copies across all platforms, making it the best-selling game in history.' WHERE summary = 'Gaming';
UPDATE filler_questions SET explanation = 'Bruce Wayne witnessed his parents'' murder as a child, leading him to become the caped crusader.' WHERE summary = 'Comics';
UPDATE filler_questions SET explanation = '"Stranger Things" follows a group of kids in the 1980s, including Eleven, who has telekinetic powers.' WHERE summary = 'Streaming';
UPDATE filler_questions SET explanation = 'Released in 1937, "Snow White and the Seven Dwarfs" was the first full-length cel-animated feature film.' WHERE summary = 'Animation';
UPDATE filler_questions SET explanation = 'YouTube was founded by three former PayPal employees: Chad Hurley, Steve Chen, and Jawed Karim.' WHERE summary = 'Internet';
UPDATE filler_questions SET explanation = 'Hedwig was a snowy owl given to Harry Potter on his 11th birthday by Rubeus Hagrid.' WHERE summary = 'Harry Potter';
UPDATE filler_questions SET explanation = 'Darth Vader, formerly Anakin Skywalker, reveals his identity to Luke during their duel on Cloud City.' WHERE summary = 'Star Wars';

-- Update GEOGRAPHY explanations
UPDATE filler_questions SET explanation = 'Asia is the largest continent, covering about 30% of Earth''s total land area.' WHERE summary = 'Continents';
UPDATE filler_questions SET explanation = 'The Challenger Deep within the Mariana Trench is the deepest known point in the Earth''s oceans.' WHERE summary = 'Oceans';
UPDATE filler_questions SET explanation = 'India surpassed China as the most populous country in 2023.' WHERE summary = 'Countries';
UPDATE filler_questions SET explanation = 'The Nile is widely considered the longest river in the world, though the Amazon''s length is often debated.' WHERE summary = 'Rivers';
UPDATE filler_questions SET explanation = 'Canberra was selected as the capital in 1908 as a compromise between rivals Sydney and Melbourne.' WHERE summary = 'Capitals';
UPDATE filler_questions SET explanation = 'Mount Everest''s peak is the highest point above sea level, located in the Himalayas.' WHERE summary = 'Mountains';
UPDATE filler_questions SET explanation = 'The Sahara covers 3.6 million square miles, nearly the size of the United States.' WHERE summary = 'Deserts';
UPDATE filler_questions SET explanation = 'The Japanese characters that make up Japan''s name mean "sun origin", which is often translated as "Land of the Rising Sun".' WHERE summary = 'Islands';
UPDATE filler_questions SET explanation = 'Lake Superior is the largest of the Great Lakes and the largest freshwater lake by surface area.' WHERE summary = 'Lakes';
UPDATE filler_questions SET explanation = 'There are 50 states in the union, with Hawaii being the last to join in 1959.' WHERE summary = 'United States';

-- Update SPORTS explanations
UPDATE filler_questions SET explanation = 'The Summer and Winter Olympics are each held every 4 years, alternating every 2 years.' WHERE summary = 'Olympics';
UPDATE filler_questions SET explanation = 'Brazil has won the FIFA World Cup five times (1958, 1962, 1970, 1994, 2002).' WHERE summary = 'Soccer';
UPDATE filler_questions SET explanation = 'A basketball team consists of 5 players on the court at any given time.' WHERE summary = 'Basketball';
UPDATE filler_questions SET explanation = 'Wimbledon is the oldest tennis tournament in the world and is the only Grand Slam played on grass.' WHERE summary = 'Tennis';
UPDATE filler_questions SET explanation = 'A birdie is scored by hitting the ball into the hole in one stroke less than the par for that hole.' WHERE summary = 'Golf';
UPDATE filler_questions SET explanation = 'A standard baseball game consists of nine innings, unless the score is tied or affected by weather.' WHERE summary = 'Baseball';
UPDATE filler_questions SET explanation = 'Muhammad Ali is widely regarded as one of the most significant and celebrated sports figures of the 20th century.' WHERE summary = 'Boxing';
UPDATE filler_questions SET explanation = 'Both Michael Schumacher and Lewis Hamilton have won seven F1 World Drivers'' Championship titles.' WHERE summary = 'Formula 1';
UPDATE filler_questions SET explanation = 'An ice hockey puck is a disk made of vulcanized rubber.' WHERE summary = 'Hockey';
UPDATE filler_questions SET explanation = 'A touchdown is worth 6 points, followed by an opportunity for a field goal or two-point conversion.' WHERE summary = 'American Football';
