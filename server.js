const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

// Fonts Directory Setup
const FONTS_DIR = path.join(__dirname, 'fonts');
if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Fonts Config Routes
const FONTS_CONFIG_FILE = path.join(__dirname, 'fonts-config.json');

app.get('/api/fonts-config', (req, res) => {
    try {
        if (fs.existsSync(FONTS_CONFIG_FILE)) {
            const data = fs.readFileSync(FONTS_CONFIG_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({ 
                googleFonts: [
                    { name: 'Outfit', enabled: true },
                    { name: 'Inter', enabled: true },
                    { name: 'Roboto', enabled: true },
                    { name: 'Playfair Display', enabled: true },
                    { name: 'Fira Code', enabled: true }
                ], 
                customFonts: [] 
            });
        }
    } catch (error) {
        console.error('Error reading fonts config:', error);
        res.status(500).json({ error: 'Failed to read fonts config' });
    }
});

app.post('/api/fonts-config', isAuthenticated, (req, res) => {
    try {
        const newConfig = req.body;
        fs.writeFileSync(FONTS_CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
        res.json({ success: true, message: 'Fonts configuration saved successfully.' });
    } catch (error) {
        console.error('Error saving fonts config:', error);
        res.status(500).json({ success: false, error: 'Failed to save fonts config' });
    }
});

// Upload Custom Font Route
app.post('/api/upload-font', isAuthenticated, (req, res) => {
    try {
        const { fileData, fileName } = req.body;
        
        if (!fileData || !fileName) {
            return res.status(400).json({ success: false, message: 'No font data provided' });
        }

        // Validate file extension
        const validExtensions = ['.ttf', '.woff', '.woff2', '.otf'];
        const ext = path.extname(fileName).toLowerCase();
        
        if (!validExtensions.includes(ext)) {
            return res.status(400).json({ success: false, message: 'Invalid font file format. Allowed: .ttf, .woff, .woff2, .otf' });
        }

        const base64Data = fileData.split(',')[1];
        if (!base64Data) {
            return res.status(400).json({ success: false, message: 'Invalid file data format' });
        }

        // Generate a safe unique filename to avoid overwrites (if needed) but simple filename is fine for now
        const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(FONTS_DIR, safeFileName);
        
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        
        // Return the relative URL to the uploaded font
        const fileUrl = `/fonts/${safeFileName}`;

        res.json({ success: true, message: 'Font uploaded successfully', fontUrl: fileUrl, fileName: safeFileName });
    } catch (error) {
        console.error('Error uploading font:', error);
        res.status(500).json({ success: false, message: 'Failed to upload font file' });
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

app.post('/api/upload-logo', isAuthenticated, (req, res) => {
    const { theme, imageBase64 } = req.body;
    
    if (!theme || !['light', 'dark'].includes(theme) || !imageBase64) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    // Determine filename
    const filename = theme === 'light' ? 'logo-light.png' : 'logo-dark.png';
    const filepath = path.join(__dirname, filename);
    
    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid base64 image data' });
    }
    
    const buffer = Buffer.from(matches[2], 'base64');
    
    fs.writeFile(filepath, buffer, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save logo' });
        res.json({ success: true, message: `Logo for ${theme} theme saved successfully.` });
    });
});

// Serve static files from root directory
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
