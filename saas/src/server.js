const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Look for SSL certificates in multiple locations
const possibleDirs = [
  path.join(__dirname, '..', 'certs'),
  '/home/sedu/docgen/certs',
  '/docgen/certs'
];

for (const dir of possibleDirs) {
  try {
    // Try IP-based cert names first
    let keyPath = path.join(dir, '10.0.0.59+2-key.pem');
    let certPath = path.join(dir, '10.0.0.59+2.pem');
    
    // If IP-based certs don't exist, try domain-based names
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      keyPath = path.join(dir, 'server-key.pem');
      certPath = path.join(dir, 'server.pem');
    }
    
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      console.log(`Found SSL certificates in ${dir}`);
      const key = fs.readFileSync(keyPath);
      const cert = fs.readFileSync(certPath);
      
      // Create HTTPS server
      const httpsServer = https.createServer({ key, cert }, app);
      
      // Start the server - listen on all interfaces
      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`HTTPS SaaS server running at https://documentit.io:${PORT}`);
      });
      
      return;
    }
  } catch (error) {
    console.error(`Error loading certificates from ${dir}:`, error.message);
  }
}

// Root route serves the index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// A route to redirect to the app
app.get('/app', (req, res) => {
  res.redirect('https://app.documentit.io');
}); 