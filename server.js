const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Use /tmp on Vercel serverless environment, local file otherwise
const dbPath = process.env.VERCEL ? '/tmp/foodshare.db' : './foodshare.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err.message);
    console.log('✅ Connected to FoodShare SQLite Database.');
});

// Create Tables & Seed Rich Demo Data
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        phone TEXT,
        verified INTEGER DEFAULT 1
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donorName TEXT,
        eventType TEXT,
        foodItems TEXT,
        quantity INTEGER,
        location TEXT,
        expiryTime TEXT,
        imageUrl TEXT,
        status TEXT DEFAULT 'Available',
        volunteerName TEXT DEFAULT 'Unassigned',
        ngoName TEXT DEFAULT 'Pending NGO',
        createdAt TEXT
    )`);

    // Seed Default Users (Donors, Volunteers, NGOs, Admin)
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`);
    insertUser.run('Royal Banquet Hall', 'donor@demo.com', '1234', 'donor', '9876543210');
    insertUser.run('Grand Wedding Palace', 'palace@demo.com', '1234', 'donor', '9876543211');
    insertUser.run('TechCorp Catering', 'techcorp@demo.com', '1234', 'donor', '9876543212');
    insertUser.run('Spice Garden Hotel', 'spice@demo.com', '1234', 'donor', '9876543213');

    insertUser.run('Rahul Sharma (Rider)', 'volunteer@demo.com', '1234', 'volunteer', '9123456780');
    insertUser.run('Sneha Patil (Rider)', 'sneha@demo.com', '1234', 'volunteer', '9123456781');
    insertUser.run('Amit Verma (Rider)', 'amit@demo.com', '1234', 'volunteer', '9123456782');

    insertUser.run('Helping Hands NGO', 'ngo@demo.com', '1234', 'ngo', '9988776655');
    insertUser.run('Robin Hood Food Army', 'robinhood@demo.com', '1234', 'ngo', '9988776656');
    insertUser.run('Asha Kiran Foundation', 'ashakiran@demo.com', '1234', 'ngo', '9988776657');

    insertUser.run('System Admin', 'admin@demo.com', '1234', 'admin', '9000000000');
    insertUser.finalize();

    // Seed Sample Food Donations if empty
    db.get("SELECT COUNT(*) as count FROM donations", (err, row) => {
        if (row && row.count === 0) {
            const insertFood = db.prepare(`INSERT INTO donations (donorName, eventType, foodItems, quantity, location, expiryTime, imageUrl, status, volunteerName, ngoName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            insertFood.run('Grand Wedding Palace', 'Wedding Reception 💍', 'Paneer Tikka, Veg Biryani, Dal Makhani & Gulab Jamun', 120, 'Mira Road East, Mumbai', new Date(Date.now() + 4 * 3600000).toISOString(), 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600', 'Available', 'Unassigned', 'Pending NGO', new Date().toLocaleDateString());
            insertFood.run('TechCorp Annual Meet', 'Corporate Event 🏢', 'Packed Veg Meals, Sandwiches & Fruit Juice Boxes', 65, 'BKC, Mumbai', new Date(Date.now() + 2 * 3600000).toISOString(), 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', 'Assigned', 'Rahul Sharma (Rider)', 'Helping Hands NGO', new Date().toLocaleDateString());
            insertFood.run('Spice Garden Hotel', 'Hotel & Restaurant Surplus 🏨', 'Rotis, Mix Veg Curry, Jeera Rice & Sweet Boondi', 85, 'Andheri West, Mumbai', new Date(Date.now() + 5 * 3600000).toISOString(), 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600', 'Delivered', 'Rahul Sharma (Rider)', 'Helping Hands NGO', new Date().toLocaleDateString());
            insertFood.run('Royal Banquet Hall', 'Birthday Celebration 🎉', 'Pav Bhaji, Pulao, Hakka Noodles & Ice Cream Cups', 95, 'Borivali West, Mumbai', new Date(Date.now() + 6 * 3600000).toISOString(), 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', 'Delivered', 'Sneha Patil (Rider)', 'Robin Hood Food Army', new Date().toLocaleDateString());
            insertFood.finalize();
        }
    });
});

// --- API ROUTES ---

app.get('/api/stats', (req, res) => {
    const stats = {};
    db.get(`SELECT COALESCE(SUM(quantity), 0) as totalMeals, COUNT(*) as totalDrives FROM donations`, [], (err, dRow) => {
        stats.totalMeals = dRow ? dRow.totalMeals : 0;
        stats.totalDrives = dRow ? dRow.totalDrives : 0;

        db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'volunteer'`, [], (err, vRow) => {
            stats.volunteersCount = vRow ? vRow.count : 0;

            db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'ngo'`, [], (err, nRow) => {
                stats.ngosCount = nRow ? nRow.count : 0;

                db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'donor'`, [], (err, oRow) => {
                    stats.donorsCount = oRow ? oRow.count : 0;
                    res.json(stats);
                });
            });
        });
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password, role, phone } = req.body;
    db.run(`INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
        [name, email, password, role, phone],
        function (err) {
            if (err) return res.status(400).json({ error: 'Email already exists' });
            res.json({ id: this.lastID, name, email, role, phone });
        });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT id, name, email, role, phone FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json(user);
    });
});

app.get('/api/donations', (req, res) => {
    db.all(`SELECT * FROM donations ORDER BY id DESC`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/donations', (req, res) => {
    const { donorName, eventType, foodItems, quantity, location, hoursValid, imageUrl } = req.body;
    const expiryTime = new Date(Date.now() + (hoursValid || 4) * 3600000).toISOString();
    const img = imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';
    const createdAt = new Date().toLocaleDateString();

    db.run(`INSERT INTO donations (donorName, eventType, foodItems, quantity, location, expiryTime, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [donorName, eventType, foodItems, quantity, location, expiryTime, img, createdAt],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Food listed successfully!' });
        });
});

app.put('/api/donations/:id', (req, res) => {
    const { status, volunteerName, ngoName } = req.body;
    db.run(`UPDATE donations SET status = COALESCE(?, status), volunteerName = COALESCE(?, volunteerName), ngoName = COALESCE(?, ngoName) WHERE id = ?`,
        [status, volunteerName, ngoName, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Status updated!' });
        });
});

app.get('/api/users', (req, res) => {
    db.all(`SELECT id, name, email, role, phone, verified FROM users`, [], (err, rows) => {
        res.json(rows || []);
    });
});

app.delete('/api/donations/:id', (req, res) => {
    db.run(`DELETE FROM donations WHERE id = ?`, [req.params.id], function (err) {
        res.json({ message: 'Deleted successfully' });
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 FoodShare Events running at http://localhost:${PORT}`);
    });
}

module.exports = app;
