#!/usr/bin/env node
// Simple HTTP server to serve the walkerOS Explorer demo
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3002;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.cjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/examples/index.html' : req.url;

  // Special handling for explorer.js - redirect to dist/explorer.js
  if (filePath === '/explorer.js' || filePath === '/explorer.js.map') {
    filePath = '/dist' + filePath;
  }

  // Check if file exists in examples directory first
  if (!filePath.startsWith('/dist/') && !filePath.startsWith('/examples/')) {
    // Try to find file in examples directory
    const examplesPath = path.join(__dirname, 'examples', filePath);
    if (fs.existsSync(examplesPath)) {
      filePath = '/examples' + filePath;
    }
  }

  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found: ' + req.url);
      } else {
        res.writeHead(500);
        res.end('Server error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => {
  console.log(`🚀 walkerOS Explorer Demo Server running at:`);
  console.log(`   http://localhost:${port}`);
  console.log(`\n📋 Available demos:`);
  console.log(`   • Main Page: http://localhost:${port}/`);
  console.log(`   • LiveCode Examples: http://localhost:${port}/livecode.html`);
  console.log(`   • Built files: http://localhost:${port}/dist/`);
  console.log(
    `\n🎯 Test the new clean architecture components in your browser!`,
  );
  console.log(`\n⚡ Press Ctrl+C to stop the server`);
});
