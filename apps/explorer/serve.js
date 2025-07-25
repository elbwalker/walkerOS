#!/usr/bin/env node
// Simple HTTP server to serve the walkerOS Explorer demo
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3001;

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
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
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
  console.log(`   • Main Demo: http://localhost:${port}/index.html`);
  console.log(`   • Built files available at: http://localhost:${port}/dist/`);
  console.log(
    `\n🎯 Test all Phase 1 components interactively in your browser!`,
  );
  console.log(`\n⚡ Press Ctrl+C to stop the server`);
});
