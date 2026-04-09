const db = require('./config/db');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS user_libraries (
    library_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_id INT NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (game_id) REFERENCES games(game_id),
    UNIQUE KEY unique_purchase (user_id, game_id)
);`;

async function init() {
    try {
        await db.query(createTableSQL);
        console.log("Table 'user_libraries' created successfully in RDS!");
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

init();