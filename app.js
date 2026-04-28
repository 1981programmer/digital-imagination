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

app.get('/register', (req, res) => {
    res.render('register', { 
        user: req.session.user,      
        cart: req.session.cart || [] 
    });
});

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

app.get('/login', (req, res) => {
    res.render('login', { 
        user: req.session.user,      
        cart: req.session.cart || [] 
    });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.send('Invalid username or password.');
        const isMatch = await bcrypt.compare(password, users[0].password);
        if (isMatch) {
            req.session.user = users[0].username;
            req.session.user_id = users[0].user_id; 
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

app.get('/', (req, res) => {
    res.render('home', { 
        user: req.session.user, 
        cart: req.session.cart || [] 
    });
});

app.get('/store', async (req, res) => {
    const currentUser = req.session.user || ''; 
    const added = req.query.added; 

    const query = `
        SELECT games.*, 
               user_libraries.library_id, 
               AVG(reviews.rating) AS avg_rating
        FROM games
        LEFT JOIN users ON users.username = ?
        LEFT JOIN user_libraries ON games.game_id = user_libraries.game_id AND users.user_id = user_libraries.user_id
        LEFT JOIN reviews ON games.game_id = reviews.game_id
        GROUP BY games.game_id, user_libraries.library_id
    `;
    
    try {
        const [games] = await db.query(query, [currentUser]);
        res.render('index', { 
            games: games, 
            user: req.session.user, 
            cart: req.session.cart,
            added: added
        });
    } catch (err) {
        console.error("Store Error:", err);
        res.status(500).send("Error fetching games.");
    }
});

app.get('/library', isAuthenticated, async (req, res) => {
    const username = req.session.user;
    const message = req.query.message; 
    try {
        const query = `
            SELECT games.*, reviews.review_id 
            FROM games
            JOIN user_libraries ON games.game_id = user_libraries.game_id
            JOIN users ON user_libraries.user_id = users.user_id
            LEFT JOIN reviews ON games.game_id = reviews.game_id AND users.user_id = reviews.user_id
            WHERE users.username = ?
        `;
        const [userGames] = await db.query(query, [username]);
        res.render('library', { 
            username: username, 
            games: userGames, 
            user: req.session.user, 
            cart: req.session.cart,
            message: message 
        });
    } catch (err) {
        res.status(500).send("Could not load your library.");
    }
});

app.post('/cart/add', isAuthenticated, (req, res) => {
    const { gameId, gameTitle } = req.body;
    
    if (!req.session.cart) {
        req.session.cart = [];
    }

    const exists = req.session.cart.find(item => item.id === gameId);
    if (!exists) {
        req.session.cart.push({ id: gameId, title: gameTitle });
    }

    res.redirect('/store?added=' + encodeURIComponent(gameTitle));
});

app.get('/cart', isAuthenticated, (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart: cart, user: req.session.user });
});

app.get('/cart/remove/:gameId', (req, res) => {
    const gameIdToRemove = req.params.gameId;

    if (req.session.cart) {
        req.session.cart = req.session.cart.filter(item => item.id != gameIdToRemove);
    }

    res.redirect('/cart'); 
});

app.post('/checkout', isAuthenticated, async (req, res) => {
    const cart = req.session.cart;
    const username = req.session.user;

    if (!cart || cart.length === 0) {
        return res.redirect('/');
    }

    try {
        const [userResult] = await db.query('SELECT user_id FROM users WHERE username = ?', [username]);
        const userId = userResult[0].user_id;

        for (const item of cart) {
            await db.query(
                'INSERT IGNORE INTO user_libraries (user_id, game_id) VALUES (?, ?)',
                [userId, item.id]
            );
        }

        req.session.cart = [];
        res.redirect('/library');

    } catch (err) {
        console.error("Checkout Error:", err);
        res.status(500).send("Could not complete checkout.");
    }
});

app.get('/community', async (req, res) => {
    try {
        const [games] = await db.query('SELECT * FROM games');
        res.render('community', { 
            games: games, 
            user: req.session.user,
            cart: req.session.cart || [] 
        });
    } catch (err) {
        console.error("Community Hub Error:", err);
        res.status(500).send("Error loading community hub.");
    }
});

app.get('/community/:id', async (req, res) => {
    const gameId = req.params.id;
    try {
        const [gameResult] = await db.query('SELECT * FROM games WHERE game_id = ?', [gameId]);
        if (gameResult.length === 0) return res.status(404).send("Game not found.");

        const discussionsQuery = `
            SELECT discussions.*, users.username 
            FROM discussions 
            JOIN users ON discussions.user_id = users.user_id 
            WHERE discussions.game_id = ? 
            ORDER BY created_at DESC`;
        const [discussions] = await db.query(discussionsQuery, [gameId]);

        res.render('game_community', { 
            game: gameResult[0], 
            discussions: discussions,
            user: req.session.user,
            cart: req.session.cart || [] 
        });
    } catch (err) {
        console.error("Game Community Error:", err);
        res.status(500).send("Database error.");
    }
});

app.get('/discussion/create/:gameId', isAuthenticated, async (req, res) => {
    const gameId = req.params.gameId;
    try {
        const [game] = await db.query('SELECT * FROM games WHERE game_id = ?', [gameId]);
        res.render('create_discussion', { 
            game: game[0], 
            user: req.session.user,
            cart: req.session.cart || [] 
        });
    } catch (err) {
        res.status(500).send("Error loading creation form.");
    }
});

app.post('/discussion/create', isAuthenticated, async (req, res) => {
    const { gameId, title, comment } = req.body;
    const userId = req.session.user_id; 
    
    if (!title || !comment) {
        return res.status(400).send("Title and comment are required.");
    }

    try {
        const query = 'INSERT INTO discussions (game_id, user_id, title, comment) VALUES (?, ?, ?, ?)';
        await db.query(query, [gameId, userId, title, comment]);
        res.redirect('/community/' + gameId);
    } catch (err) {
        console.error("Discussion Post Error:", err);
        res.status(500).send("Error submitting discussion.");
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

        const [existing] = await db.query(
            'SELECT * FROM reviews WHERE user_id = ? AND game_id = ?', 
            [userId, gameId]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE reviews SET rating = ?, comment = ? WHERE user_id = ? AND game_id = ?',
                [rating, comment, userId, gameId]
            );
        } else {
            await db.query(
                'INSERT INTO reviews (user_id, game_id, rating, comment) VALUES (?, ?, ?, ?)',
                [userId, gameId, rating, comment]
            );
        }

        res.redirect('/library?message=ReviewSubmitted');
    } catch (err) {
        console.error(err);
        res.status(500).send("Could not save review.");
    }
});

app.get('/game/:id', async (req, res) => {
    const gameId = req.params.id;
    
    try {
        const [gameResult] = await db.query('SELECT * FROM games WHERE game_id = ?', [gameId]);
        
        if (gameResult.length === 0) {
            return res.status(404).send("Game not found.");
        }

        const reviewsQuery = `
            SELECT reviews.*, users.username 
            FROM reviews 
            JOIN users ON reviews.user_id = users.user_id 
            WHERE reviews.game_id = ? 
            ORDER BY created_at DESC`;
        const [reviews] = await db.query(reviewsQuery, [gameId]);

        res.render('game_review', { 
            game: gameResult[0], 
            reviews: reviews,
            user: req.session.user,
            cart: req.session.cart
        });
    } catch (err) {
        console.error("Error loading game details:", err);
        res.status(500).send("Database error.");
    }
});

// --- UPDATED GET ROUTE FOR NESTED REPLIES ---
app.get('/discussion/:id', async (req, res) => {
    const discussionId = req.params.id;

    try {
        const [discussion] = await db.query(`
            SELECT d.*, u.username 
            FROM discussions d
            JOIN users u ON d.user_id = u.user_id
            WHERE d.discussion_id = ?
        `, [discussionId]);

        if (discussion.length === 0) {
            return res.status(404).send('Discussion not found');
        }

        const [replies] = await db.query(`
            SELECT r.*, u.username 
            FROM replies r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.discussion_id = ?
            ORDER BY r.created_at ASC
        `, [discussionId]);

        // Build the "Tree" of nested replies in Node.js
        const replyMap = {};
        const topLevelReplies = [];

        // 1. Give every reply an empty children array
        replies.forEach(reply => {
            reply.children = [];
            replyMap[reply.reply_id] = reply;
        });

        // 2. Loop again to organize them
        replies.forEach(reply => {
            if (reply.parent_reply_id) {
                // If it has a parent, push it into the parent's children array
                if (replyMap[reply.parent_reply_id]) {
                    replyMap[reply.parent_reply_id].children.push(reply);
                }
            } else {
                // If it has no parent, it's a top-level reply
                topLevelReplies.push(reply);
            }
        });

        res.render('discussion_thread', { 
            discussion: discussion[0], 
            replies: topLevelReplies,  // Pass the nested tree instead of the flat list
            user: req.session.user,
            cart: req.session.cart || []
        });

    } catch (error) {
        console.error("Error fetching discussion:", error);
        res.status(500).send("Internal Server Error");
    }
});

// --- UPDATED POST ROUTE FOR NESTED REPLIES ---
app.post('/discussion/:id/reply', async (req, res) => {
    const discussionId = req.params.id;
    const replyContent = req.body.content;
    const parentReplyId = req.body.parent_reply_id || null; // Capture parent_reply_id from form
    
    const userId = req.session.user_id; 

    if (!userId) {
        return res.status(401).send('You must be logged in to reply.');
    }

    try {
        await db.query(`
            INSERT INTO replies (discussion_id, user_id, content, parent_reply_id) 
            VALUES (?, ?, ?, ?)
        `, [discussionId, userId, replyContent, parentReplyId]);

        res.redirect(`/discussion/${discussionId}`);

    } catch (error) {
        console.error("Error posting reply:", error);
        res.status(500).send("Internal Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DI Server is running on http://localhost:${PORT}`);
});