-- supabase/migrations/0004_add_wild_rift.sql

INSERT INTO filler_questions (topic, summary, text, type, options, correct_answer, explanation) VALUES
('wild rift', 'Champions', 'Which champion has the ultimate ability "Enchanted Crystal Arrow"?', 'multiple_choice', '["Ezreal", "Ashe", "Jinx", "Draven"]', 'Ashe', 'Ashe fires a giant ice arrow that stuns the first enemy hit.'),
('wild rift', 'Items', 'Which item provides the "Stasis" active effect?', 'multiple_choice', '["Guardian Angel", "Zhonya''s Lace", "Quicksilver Enchant", "Stasis Enchant"]', 'Stasis Enchant', 'Stasis Enchant makes the user untargetable and invulnerable for 2.5 seconds.'),
('wild rift', 'Objectives', 'The Elder Dragon spawn provides a permanent buff.', 'boolean', NULL, 'False', 'Elder Dragon buff is temporary and provides a burn and execute effect.'),
('wild rift', 'Gameplay', 'How many players are on each team in a standard Wild Rift match?', 'text', NULL, '5', 'Standard matches are 5v5.'),
('wild rift', 'Champions', 'Which champion is known as the "Sinister Blade"?', 'text', NULL, 'Katarina', 'Katarina is a high-mobility assassin known as the Sinister Blade.'),
('wild rift', 'Lanes', 'The "Duo Lane" is typically played by a Marksman and a Support.', 'boolean', NULL, 'True', 'The Duo Lane is usually on the side with the Dragon.'),
('wild rift', 'Runes', 'Which keystone rune provides a burst of movement speed after hitting a champion with 3 separate attacks or abilities?', 'multiple_choice', '["Electrocute", "Conqueror", "Phase Rush", "Fleet Footwork"]', 'Phase Rush', 'Phase Rush gives a massive MS boost and slow resistance.'),
('wild rift', 'Jungle', 'What is the name of the monster that spawns in the Baron pit before 12 minutes?', 'text', NULL, 'Rift Herald', 'Rift Herald can be summoned to push lanes and damage turrets.'),
('wild rift', 'Champions', 'Lee Sin can dash to allies using his "Safeguard" ability.', 'boolean', NULL, 'True', 'Lee Sin''s Safeguard allows him to dash to friendly units or wards.'),
('wild rift', 'Esports', 'Wild Rift was developed by Blizzard Entertainment.', 'boolean', NULL, 'False', 'Wild Rift is developed by Riot Games.'),
('wild rift', 'Champions', 'Which champion can reset their ultimate cooldown upon getting a takedown?', 'multiple_choice', '["Darius", "Garen", "Lux", "Malphite"]', 'Darius', 'Darius''s Noxian Guillotine resets if it kills the target.'),
('wild rift', 'Items', 'What is the maximum number of items a champion can hold (excluding boots enchant)?', 'text', NULL, '6', 'Champions have 6 item slots.'),
('wild rift', 'Spells', 'The "Flash" spell has a shorter cooldown than "Ignite".', 'boolean', NULL, 'False', 'Flash generally has the longest cooldown of all summoner spells.'),
('wild rift', 'Champions', 'Who is the "Blade of the Ruined King" in the lore?', 'text', NULL, 'Viego', 'Viego is the Ruined King who searches for his lost queen.'),
('wild rift', 'Monsters', 'Killing the Blue Sentinel provides the "Crest of Insight" (Blue Buff).', 'boolean', NULL, 'True', 'Blue Buff provides mana/energy regeneration and ability haste.');
