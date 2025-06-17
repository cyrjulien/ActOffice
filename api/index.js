const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;
const CLIENT_ID = '490585411303-rqqml2gfgevu094mnntorupa7vphqgn3.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);
const ADMIN_EMAIL = 'cyrjulien@gmail.com';

let db;

// This is a bit of a hack for Vercel's file system.
// In a serverless environment, the file path needs to be writable.
const dbPath = process.env.VERCEL ? '/tmp/database.sqlite' : './database.sqlite';

// Fonction pour initialiser la base de données
async function initializeDatabase() {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                picture TEXT,
                isAdmin BOOLEAN DEFAULT FALSE,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // S'assurer que l'admin existe
        const adminUser = await db.get('SELECT * FROM users WHERE email = ?', ADMIN_EMAIL);
        if (!adminUser) {
            await db.run('INSERT INTO users (id, email, name, isAdmin) VALUES (?, ?, ?, ?)', [`google_${Date.now()}`, ADMIN_EMAIL, 'Admin', true]);
        }
        console.log('Database initialized at', dbPath);
    } catch (error) {
        console.error('Failed to initialize database:', error);
        // Exit gracefully if DB fails to initialize
        process.exit(1);
    }
}

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques depuis la racine du projet


// Route d'authentification
app.post('/api/auth', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: id, email, name, picture } = payload;

        let user = await db.get('SELECT * FROM users WHERE email = ?', email);
        if (user) {
            // Update user info on login
            await db.run('UPDATE users SET name = ?, picture = ? WHERE email = ?', [name, picture, email]);
        } else {
            // Insert new user
            const isAdmin = email === ADMIN_EMAIL;
            await db.run(
                'INSERT INTO users (id, email, name, picture, isAdmin) VALUES (?, ?, ?, ?, ?)',
                [id, email, name, picture, isAdmin]
            );
        }
        
        // Retrieve the latest user data
        user = await db.get('SELECT id, email, name, picture, isAdmin FROM users WHERE email = ?', email);
        res.json(user);

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Route pour obtenir la liste des utilisateurs (admin seulement)
app.get('/api/users', async (req, res) => {
    if (!db) {
        return res.status(500).json({ error: 'Database not initialized' });
    }
    // In a real app, you'd verify a session token (e.g., a JWT) here.
    const adminEmailFromQuery = req.query.adminEmail; 
    
    const admin = await db.get('SELECT * FROM users WHERE email = ? AND isAdmin = TRUE', adminEmailFromQuery);

    if (!admin) {
        return res.status(403).json({ error: 'Forbidden: Not an admin' });
    }

    try {
        const users = await db.all('SELECT id, email, name, createdAt FROM users ORDER BY createdAt DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});



// Initialize DB and then start server
initializeDatabase().then(() => {
    // This part is for local development. Vercel will use the exported `app`.
    if (!process.env.VERCEL) {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    }
}).catch(err => {
    console.error("Startup failed:", err);
});

// Export the app for Vercel
module.exports = app;
