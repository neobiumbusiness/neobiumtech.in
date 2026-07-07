const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'neobium_secret_key_123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Admin credentials
const ADMIN_USER = 'business.neobium@gmail.com';
const ADMIN_PASS = 'Flynv245$#@@#$';

// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// Authentication Routes
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_USER && password === ADMIN_PASS) {
        req.session.loggedIn = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Admin Dashboard Route
app.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API to manage pages (Requires Authentication)
app.get('/api/pages', isAuthenticated, (req, res) => {
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list directory' });
        const htmlFiles = files.filter(f => f.endsWith('.html') && f !== 'admin.html' && f !== 'login.html');
        res.json(htmlFiles);
    });
});

app.get('/api/pages/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    if (!filename.endsWith('.html')) return res.status(400).json({ error: 'Invalid file type' });
    
    const filepath = path.join(__dirname, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });

    fs.readFile(filepath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read file' });
        res.json({ content: data });
    });
});

app.post('/api/pages', isAuthenticated, (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !filename.endsWith('.html')) return res.status(400).json({ error: 'Invalid filename' });

    const filepath = path.join(__dirname, filename);
    if (fs.existsSync(filepath)) return res.status(400).json({ error: 'File already exists' });

    fs.writeFile(filepath, content, 'utf8', (err) => {
        if (err) return res.status(500).json({ error: 'Failed to create file' });
        res.json({ success: true });
    });
});

app.put('/api/pages/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const { content } = req.body;
    if (!filename.endsWith('.html')) return res.status(400).json({ error: 'Invalid file type' });
    
    const filepath = path.join(__dirname, filename);
    fs.writeFile(filepath, content, 'utf8', (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update file' });
        res.json({ success: true });
    });
});

app.delete('/api/pages/:filename', isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    if (!filename.endsWith('.html')) return res.status(400).json({ error: 'Invalid file type' });
    
    const filepath = path.join(__dirname, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found' });

    fs.unlink(filepath, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete file' });
        res.json({ success: true });
    });
});

// Serve static files from root directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
