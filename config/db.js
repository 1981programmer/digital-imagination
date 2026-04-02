const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,     // We will get this from the RDS "Endpoint"
    user: process.env.DB_USER,     // 'admin'
    password: process.env.DB_PASSWORD, 
    database: 'digital_imagination',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();