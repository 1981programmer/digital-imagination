const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    console.log("Connecting to AWS RDS Server... please wait.");
    
    // Connect to the server WITHOUT specifying a database first
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true // Crucial for running the whole file
    });

    try {
        console.log("Connected! Creating database and tables...");
        
        // Read your schema.sql file
        const sql = fs.readFileSync(path.join(__dirname, 'config', 'schema.sql'), 'utf8');
        
        // This runs the "CREATE DATABASE" and all "CREATE TABLE" commands in your file
        await connection.query(sql);
        
        console.log('--- SUCCESS! ---');
        console.log('Digital Imagination Database created.');
        console.log('All Tables and 50 Games have been uploaded to AWS RDS.');
        
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Error running migration:', err);
        await connection.end();
        process.exit(1);
    }
}

runMigration();