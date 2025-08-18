// Minimal test server for Railway debugging
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ 
        message: 'VidPOD Backend is running!', 
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/', (req, res) => {
    res.json({ 
        status: 'success',
        message: 'API is working',
        endpoints: ['/api/stories', '/api/auth', '/api/admin']
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
});