const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./config/db');

// The Password Requirement Pattern (RegEx)
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// This allows req.body to work for ALL your POST routes automatically
app.use(express.urlencoded({ extended: true }));

// Middleware for app.js
app.use(session({
    secret: 'di-secret-key', 
    resave: false,
    saveUninitialized: true
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Function to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// --- AUTHENTICATION ROUTES ---

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!passwordPattern.test(password)) {
        return res.send("Password must be at least 8 characters long, include an uppercase letter, a number, and a special character.");
    }
    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser.length > 0) return res.send("Username or Email is already registered.");
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        res.redirect('/login?message=AccountCreated');
    } catch (err) {
        res.status(500).send("Database Error: Could not create account.");
    }
});

app.get('/login', (req, res) => res.render('login'));

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.send('Invalid username or password.');
        const isMatch = await bcrypt.compare(password, users[0].password);
        if (isMatch) {
            req.session.user = users[0].username;
            res.redirect('/library');
        } else {
            res.send('Invalid username or password.');
        }
    } catch (err) {
        res.status(500).send("Database Error: Could not verify login.");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- STORE & LIBRARY ROUTES ---

app.get('/', async (req, res) => {
    const currentUser = req.session.user || ''; // Use empty string if not logged in
    const added = req.query.added; // This line "grabs" the game name from the URL

    const query = `
        SELECT games.*, user_libraries.library_id
        FROM games
        LEFT JOIN users ON users.username = ?
        LEFT JOIN user_libraries ON games.game_id = user_libraries.game_id AND users.user_id = user_libraries.user_id
    `;
    
    try {
        const [games] = await db.query(query, [currentUser]);
        // Pass all session info to the template
        res.render('index', { 
            games: games, 
            user: req.session.user, 
            cart: req.session.cart 
        });
    } catch (err) {
        res.status(500).send("Error fetching games.");
    }
});

app.get('/library', isAuthenticated, async (req, res) => {
    const username = req.session.user;
    try {
        const query = `
            SELECT games.* FROM games
            JOIN user_libraries ON games.game_id = user_libraries.game_id
            JOIN users ON user_libraries.user_id = users.user_id
            WHERE users.username = ?
        `;
        const [userGames] = await db.query(query, [username]);
        res.render('library', { username: username, games: userGames, user: req.session.user, cart: req.session.cart });
    } catch (err) {
        res.status(500).send("Could not load your library.");
    }
});

// --- NEW SHOPPING CART ROUTES ---

// 1. Add item to session-based cart
app.post('/cart/add', (req, res) => {
    const { gameId, gameTitle } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Check if game is already in cart to prevent duplicates in session
    const exists = req.session.cart.find(item => item.id === gameId);
    if (!exists) {
        req.session.cart.push({ id: gameId, title: gameTitle });
    }

    res.redirect('/?added=' + encodeURIComponent(gameTitle));
});

// 2. Render the Cart page
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart: cart, user: req.session.user });
});

// Add this route to your app.js to handle the deletion
app.get('/cart/remove/:gameId', (req, res) => {
    const gameIdToRemove = req.params.gameId;

    if (req.session.cart) {
        // We filter out the game that matches the ID passed in the URL
        req.session.cart = req.session.cart.filter(item => item.id != gameIdToRemove);
    }

    res.redirect('/cart'); // Send them back to the cart to see it's gone
});

// 3. Checkout: Move games from Session Cart to AWS RDS
app.post('/checkout', isAuthenticated, async (req, res) => {
    const cart = req.session.cart;
    const username = req.session.user;

    if (!cart || cart.length === 0) {
        return res.redirect('/');
    }

    try {
        const [userResult] = await db.query('SELECT user_id FROM users WHERE username = ?', [username]);
        const userId = userResult[0].user_id;

        // Loop through the cart and save each game to RDS
        for (const item of cart) {
            await db.query(
                'INSERT IGNORE INTO user_libraries (user_id, game_id) VALUES (?, ?)',
                [userId, item.id]
            );
        }

        // Clear cart after successful transaction
        req.session.cart = [];
        res.redirect('/library');

    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).send("Could not complete checkout.");
    }
});

app.get('/community', async (req, res) => {
    try {
        // Use LEFT JOIN to ensure the page loads even if data is slightly mismatched
        const query = `
            SELECT reviews.*, users.username, games.title 
            FROM reviews
            LEFT JOIN users ON reviews.user_id = users.user_id
            LEFT JOIN games ON reviews.game_id = games.game_id
            ORDER BY reviews.created_at DESC
        `;
        const [recentReviews] = await db.query(query);

        res.render('community', { 
            reviews: recentReviews,
            user: req.session.user,
            cart: req.session.cart 
        });
    } catch (err) {
        // Log the SPECIFIC error to the terminal so we can see what's wrong
        console.error("SQL Error in Community:", err);
        res.status(500).send("Could not load community feed. Check terminal for error.");
    }
});

app.get('/review/write/:gameId', isAuthenticated, async (req, res) => {
    try {
        const [game] = await db.query('SELECT * FROM games WHERE game_id = ?', [req.params.gameId]);
        res.render('write-review', { 
            game: game[0], 
            user: req.session.user, 
            cart: req.session.cart 
        });
    } catch (err) {
        res.status(500).send("Error loading review form.");
    }
});

app.post('/review/submit', isAuthenticated, async (req, res) => {
    const { gameId, rating, comment } = req.body;
    const username = req.session.user;

    try {
        const [userResult] = await db.query('SELECT user_id FROM users WHERE username = ?', [username]);
        const userId = userResult[0].user_id;

        // NEW: Check if this user has already reviewed this specific game
        const [existing] = await db.query(
            'SELECT * FROM reviews WHERE user_id = ? AND game_id = ?', 
            [userId, gameId]
        );

        if (existing.length > 0) {
            // If it exists, UPDATE the review instead of inserting a new one
            await db.query(
                'UPDATE reviews SET rating = ?, comment = ? WHERE user_id = ? AND game_id = ?',
                [rating, comment, userId, gameId]
            );
        } else {
            // Otherwise, insert the new review
            await db.query(
                'INSERT INTO reviews (user_id, game_id, rating, comment) VALUES (?, ?, ?, ?)',
                [userId, gameId, rating, comment]
            );
        }

        res.redirect('/community');
    } catch (err) {
        console.error(err);
        res.status(500).send("Could not save review.");
    }
});

// --- DEBUG & START ---

app.get('/debug-db', async (req, res) => {
    try {
        const [tables] = await db.query('SELECT * FROM reviews');
        res.json(tables);
    } catch (err) {
        res.status(500).send("Could not list tables: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DI Server is running on http://localhost:${PORT}`);
});