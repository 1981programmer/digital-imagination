const db = require('./config/db');

async function check() {
    try {
        // Change the query here to see whatever you want!
        const [rows] = await db.query('SELECT * FROM reviews');
        
        console.log("--- CURRENT REVIEWS IN DATABASE ---");
        console.table(rows); // console.table makes it look like a real spreadsheet!
        
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();