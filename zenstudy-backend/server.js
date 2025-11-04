const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'your_secret_key_change_this_in_production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite Database
const db = new sqlite3.Database('./zenstudy.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database');
});

// Create Tables
db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tasks Table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        subject TEXT NOT NULL,
        deadline DATE NOT NULL,
        hours INTEGER NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'Pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);

    // User Stats Table (ZenPoints, badges, etc.)
    db.run(`CREATE TABLE IF NOT EXISTS userStats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE NOT NULL,
        zenPoints INTEGER DEFAULT 0,
        completedTasks INTEGER DEFAULT 0,
        totalTasks INTEGER DEFAULT 0,
        badges TEXT DEFAULT '[]',
        lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
    )`);
});

// Helper: Run Promise-based queries
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

// JWT Middleware
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.userId = decoded.userId;
        next();
    });
}

// ============== AUTH ROUTES ==============

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Insert new user
        const userId = await dbRun(
            'INSERT INTO users (email, password, fullName) VALUES (?, ?, ?)',
            [email, password, fullName || 'User']
        );

        // Create user stats
        await dbRun(
            'INSERT INTO userStats (userId, zenPoints, badges) VALUES (?, ?, ?)',
            [userId, 0, '[]']
        );

        const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: '30d' });
        res.status(201).json({ message: 'Signup successful', token, userId });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password (in production, use bcrypt)
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ message: 'Login successful', token, userId: user.id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ============== TASK ROUTES ==============

// GET ALL TASKS (for user)
app.get('/api/tasks', verifyToken, async (req, res) => {
    try {
        const tasks = await dbAll(
            'SELECT * FROM tasks WHERE userId = ? ORDER BY deadline ASC',
            [req.userId]
        );
        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// CREATE TASK
app.post('/api/tasks', verifyToken, async (req, res) => {
    try {
        const { subject, deadline, hours, priority } = req.body;

        if (!subject || !deadline || !hours) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const taskId = await dbRun(
            'INSERT INTO tasks (userId, subject, deadline, hours, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId, subject, deadline, hours, priority || 'medium', 'Pending']
        );

        const task = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// UPDATE TASK
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
    try {
        const { subject, deadline, hours, priority, status } = req.body;
        const taskId = req.params.id;

        // Verify task belongs to user
        const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND userId = ?', [taskId, req.userId]);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const updateFields = [];
        const values = [];

        if (subject !== undefined) { updateFields.push('subject = ?'); values.push(subject); }
        if (deadline !== undefined) { updateFields.push('deadline = ?'); values.push(deadline); }
        if (hours !== undefined) { updateFields.push('hours = ?'); values.push(hours); }
        if (priority !== undefined) { updateFields.push('priority = ?'); values.push(priority); }
        if (status !== undefined) { updateFields.push('status = ?'); values.push(status); }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(taskId);
        const sql = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        await dbRun(sql, values);

        // If task marked as complete, update stats
        if (status === 'Completed') {
            await dbRun(
                'UPDATE userStats SET zenPoints = zenPoints + 10, completedTasks = completedTasks + 1 WHERE userId = ?',
                [req.userId]
            );
        }

        const updatedTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
        res.json(updatedTask);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE TASK
app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.id;

        // Verify task belongs to user
        const task = await dbGet('SELECT * FROM tasks WHERE id = ? AND userId = ?', [taskId, req.userId]);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        await dbRun('DELETE FROM tasks WHERE id = ?', [taskId]);
        res.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ============== STATS ROUTES ==============

// GET USER STATS
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        let stats = await dbGet('SELECT * FROM userStats WHERE userId = ?', [req.userId]);
        
        if (!stats) {
            await dbRun(
                'INSERT INTO userStats (userId, zenPoints, badges) VALUES (?, ?, ?)',
                [req.userId, 0, '[]']
            );
            stats = await dbGet('SELECT * FROM userStats WHERE userId = ?', [req.userId]);
        }

        // Calculate fresh stats from tasks
        const tasks = await dbAll('SELECT * FROM tasks WHERE userId = ?', [req.userId]);
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const total = tasks.length;

        res.json({
            ...stats,
            completedTasks: completed,
            totalTasks: total
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// UPDATE ZEN POINTS (when task completed)
app.post('/api/stats/addpoints', verifyToken, async (req, res) => {
    try {
        const { points } = req.body;
        await dbRun(
            'UPDATE userStats SET zenPoints = zenPoints + ? WHERE userId = ?',
            [points || 10, req.userId]
        );
        const stats = await dbGet('SELECT * FROM userStats WHERE userId = ?', [req.userId]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update points' });
    }
});

// GET DASHBOARD SUMMARY
app.get('/api/dashboard', verifyToken, async (req, res) => {
    try {
        const tasks = await dbAll('SELECT * FROM tasks WHERE userId = ?', [req.userId]);
        const stats = await dbGet('SELECT * FROM userStats WHERE userId = ?', [req.userId]);

        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const pending = total - completed;

        // Today's tasks
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = tasks.filter(t => t.deadline === today);
        const todayCompleted = todayTasks.filter(t => t.status === 'Completed').length;

        // Weekly tasks (next 7 days)
        const now = new Date();
        const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const weekTasks = tasks.filter(t => {
            const taskDate = new Date(t.deadline);
            return taskDate >= now && taskDate <= weekEnd;
        });
        const weekCompleted = weekTasks.filter(t => t.status === 'Completed').length;

        res.json({
            totalTasks: total,
            completedTasks: completed,
            pendingTasks: pending,
            dailyProgress: todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0,
            weeklyProgress: weekTasks.length > 0 ? Math.round((weekCompleted / weekTasks.length) * 100) : 0,
            zenPoints: stats?.zenPoints || 0,
            tasks: tasks
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// ============== ERROR HANDLING ==============
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`ZenStudy Backend running on http://localhost:${PORT}`);
});
