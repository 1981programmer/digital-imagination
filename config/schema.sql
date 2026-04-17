-- Create the Database
CREATE DATABASE IF NOT EXISTS digital_imagination;
USE digital_imagination;

-- 1. Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Games Table (The Store)
CREATE TABLE games (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    image_url VARCHAR(255), -- This will point to your S3 Bucket later
    category VARCHAR(50)
);

-- 3. Library Table (The "Purchased" games)
CREATE TABLE library (
    library_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    game_id INT,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (game_id) REFERENCES games(game_id)
);

-- 4. Reviews Table
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    game_id INT,
    rating INT NOT NULL CHECK (rating >= 0 AND rating <= 6),
    comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (game_id) REFERENCES games(game_id)
);

INSERT INTO games (title, description, price, category) 
VALUES ('Infinite Galaxy', 'An open-world space exploration game.', 29.99, 'RPG');

-- Batch Insert for Fake Games
INSERT INTO games (title, description, price, category) VALUES
('Cyber-Nexus 2077', 'A neon-drenched RPG in a futuristic city.', 59.99, 'RPG'),
('Dragon Quest: Legacy', 'Classic turn-based combat in a fantasy world.', 39.99, 'Adventure'),
('Space Drifter', 'Survive the vacuum of space in this roguelike.', 14.99, 'Action'),
('Quiet Meadow', 'A relaxing farming simulator with cute animals.', 19.99, 'Simulation'),
('Velocity X', 'High-speed racing through zero-gravity tracks.', 24.99, 'Racing'),
('Shadow Protocol', 'Tactical stealth missions in modern-day London.', 44.99, 'Stealth'),
('The Last Forge', 'Craft weapons and defend your village.', 29.99, 'Strategy'),
('Pixel Dungeon', '8-bit dungeon crawling at its finest.', 4.99, 'Indie'),
('Ocean Mystery', 'Explore the deep sea and find lost treasures.', 12.50, 'Adventure'),
('Battle Arena', 'Competitive multiplayer 5v5 action.', 0.00, 'MOBA'),
('Island Survival', 'Craft, hunt, and build to stay alive.', 24.99, 'Survival'),
('Wizard Academy', 'Learn spells and duel other students.', 34.99, 'Fantasy'),
('Midnight Heist', 'Plan the perfect robbery with your crew.', 19.99, 'Co-op'),
('Frostbite Peak', 'Climb the world\'s deadliest mountains.', 14.99, 'Sports'),
('Robot Revolution', 'Command an army of droids to save Earth.', 29.99, 'RTS');

INSERT INTO games (title, description, price, category) VALUES
('Neon Samurai', 'High-speed combat in a cyberpunk Kyoto.', 49.99, 'Action'),
('Stellar Architect', 'Build and manage your own space station.', 29.99, 'Simulation'),
('Echoes of the Void', 'A psychological horror set in an abandoned base.', 19.99, 'Indie'),
('Kingdom Fall', 'Grand strategy during the collapse of an empire.', 34.99, 'Strategy'),
('Pixel Pro Soccer', 'Fast-paced 16-bit arcade sports action.', 9.99, 'Sports'),
('The Alchemist Alley', 'Brew potions and run your own magic shop.', 14.99, 'RPG'),
('Circuit Breaker', 'A fast-paced puzzle game about hacking.', 4.99, 'Puzzle'),
('Wildlands Survival', 'Hunt and craft in a massive deciduous forest.', 24.99, 'Survival'),
('Galactic Mercenary', 'Choose your ship and take on dangerous bounties.', 39.99, 'Action'),
('Dust & Diesel', 'Post-apocalyptic car combat and racing.', 29.99, 'Racing'),
('Forgotten Fables', 'A beautiful hand-drawn 2D platformer.', 19.99, 'Adventure'),
('Deep Sea Miner', 'Drill for resources while avoiding giant squids.', 12.99, 'Indie'),
('Urban Architect', 'Solve traffic and housing in a growing city.', 19.99, 'Strategy'),
('Blades of Glory', 'Realistic medieval dueling and tournament play.', 24.99, 'Action'),
('Quantum Leap', 'Solve time-bending puzzles to save the future.', 14.99, 'Puzzle'),
('Rogue Planet', 'Procedurally generated exploration in deep space.', 19.99, 'RPG'),
('Super Nano-Bots', 'Control a swarm of bots to repair machines.', 9.99, 'Simulation'),
('Thief of Shadows', 'Master the art of the heist in a Victorian city.', 29.99, 'Stealth'),
('Eternal Frost', 'Keep your village warm during a never-ending winter.', 19.99, 'Survival'),
('Command Center', 'Defend Earth from an incoming alien invasion.', 34.99, 'Strategy'),
('High Velocity', 'Formula 1 style racing with futuristic cars.', 59.99, 'Racing'),
('Mystic Grove', 'Discover the secrets of an enchanted forest.', 14.99, 'Adventure'),
('Mecha Mayhem', 'Build and pilot giant robots in 1v1 combat.', 39.99, 'Action'),
('The Great Bakery', 'Manage a bakery and satisfy hungry customers.', 12.99, 'Simulation'),
('Void Runner', 'A rhythm-based platformer set in the cosmos.', 7.99, 'Indie'),
('Skyward Bound', 'Build a flying city and explore the clouds.', 29.99, 'Strategy'),
('Dungeon Keeper', 'Build traps to stop heroes from stealing your gold.', 19.99, 'RPG'),
('Warp Drive', 'Fast-paced combat in a starfighter.', 14.99, 'Action'),
('The Last Ranger', 'Protect the wildlife in a futuristic national park.', 24.99, 'Adventure'),
('Bio-Hazard', 'Stop a virus from spreading in a secret lab.', 29.99, 'Stealth'),
('Olympus Trials', 'Battle mythological beasts to become a god.', 39.99, 'Action'),
('Paper Planes', 'A peaceful flight simulator through origami worlds.', 4.99, 'Indie'),
('Gridiron Legends', 'Manage a professional football team to the top.', 19.99, 'Sports'),
('Cyborg Arena', 'Fast-paced top-down shooter with upgrades.', 14.99, 'Action'),
('Hidden Oasis', 'Find the legendary city buried under the sand.', 24.99, 'Adventure');
