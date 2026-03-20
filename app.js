const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

// The Password Requirement Pattern (RegEx)
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // 1. Check if password meets requirements
    if (!passwordPattern.test(password)) {
        return res.send("Password must be at least 8 characters long, include an uppercase letter, a number, and a special character.");
    }

    // 2. Hash the password before saving (Security!)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Later will save 'hashedPassword' to your AWS RDS table
    console.log(`User created with secure hash: ${hashedPassword}`);
    res.send("Account created securely!");
});

// Middleware for app.js
app.use(session({
    secret: 'di-secret-key', // In a real app, this would be in your .env file
    resave: false,
    saveUninitialized: true
}));

// Function to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // User is logged in, proceed!
    }
    res.redirect('/login'); // Not logged in? Redirect to login page.
}

// Routes
app.get('/login', (req, res) => res.render('login'));

app.get('/library', isAuthenticated, (req, res) => {
    res.render('library');
});

// Mock login for testing
app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
    const { username, password } = req.body;
    // Later, we will check this against your AWS RDS users table
    if (username === 'admin' && password === 'password') {
        req.session.user = username;
        res.redirect('/library');
    } else {
        res.send('Invalid credentials. For now, use admin/password.');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (like CSS or Images) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    // For now render the file. Later will pass DB data here.
    res.render('index');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DI Server is running on http://localhost:${PORT}`);
});
