'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const port = Number(process.env.PORT || 8080);
const username = process.env.CODEX_WEB_USERNAME || 'admin';
const password = process.env.CODEX_WEB_PASSWORD;
if (!password) throw new Error('CODEX_WEB_PASSWORD must be configured. Refusing public unauthenticated access.');
const expected = Buffer.from(`${username}:${password}`, 'utf8');
const html = fs.readFileSync(path.join(__dirname, 'desk.html'));
const agents = ['codex', 'claude', 'shell'];
const terminals = new Map();
let shuttingDown = false;

function startTerminal(slot, agent) {
  const base = `/terminal/${slot}/${agent}`;
  const terminalPort = 8090 + (slot - 1) * 3 + agents.indexOf(agent);
  const args = ['--interface', '127.0.0.1', '--port', String(terminalPort),
    '--base-path', base, '--writable', '--debug', '3',
    '-t', 'fontSize=13', '-t', 'rendererType=canvas', '-t', 'disableLeaveAlert=true',
    '-t', `titleFixed=${agent} / ${slot}`, path.join(__dirname, 'desk-session.sh'), String(slot), agent];
  const child = spawn('/usr/local/bin/ttyd', args, { stdio: ['ignore', 'ignore', 'pipe'], env: process.env });
  terminals.set(base, { terminalPort, child });
  child.stderr.on('data', () => { /* Terminal output and credentials are never sent to deployment logs. */ });
  child.once('error', () => console.error(`Terminal backend unavailable: ${slot}/${agent}`));
  child.once('exit', () => {
    if (!shuttingDown) setTimeout(() => startTerminal(slot, agent), 1000);
  });
}
for (let slot = 1; slot <= 3; slot++) for (const agent of agents) startTerminal(slot, agent);

function authorized(req) {
  const header = req.headers.authorization || '';
  if (!/^Basic\s+[A-Za-z0-9+/]+=*$/i.test(header)) return false;
  const supplied = Buffer.from(header.replace(/^Basic\s+/i, ''), 'base64');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
function securityHeaders(res, isPage = false) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', isPage
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'; base-uri 'none'; form-action 'self'"
    : "frame-ancestors 'self'; base-uri 'self'");
}
function challenge(res) {
  securityHeaders(res);
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="AI Workspace", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Authentication required.');
}
function terminalFor(req) {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return null; }
  const match = /^\/terminal\/([1-3])\/(codex|claude|shell)(?:\/|$)/.exec(pathname);
  return match ? terminals.get(`/terminal/${match[1]}/${match[2]}`) : null;
}
function forwardedHeaders(req) {
  const headers = { ...req.headers };
  delete headers.authorization;
  delete headers['proxy-authorization'];
  return headers;
}
const server = http.createServer((req, res) => {
  if (req.url === '/healthz' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); res.end('ok'); return;
  }
  if (!authorized(req)) { challenge(res); return; }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/' || pathname === '/index.html') {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    securityHeaders(res, true);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': html.length });
    res.end(req.method === 'HEAD' ? undefined : html); return;
  }
  const terminal = terminalFor(req);
  if (!terminal) { securityHeaders(res); res.writeHead(404); res.end('Not found.'); return; }
  const upstream = http.request({ hostname: '127.0.0.1', port: terminal.terminalPort, path: req.url,
    method: req.method, headers: forwardedHeaders(req) }, response => {
    const headers = { ...response.headers };
    delete headers['www-authenticate']; delete headers['content-security-policy']; delete headers['x-frame-options'];
    res.writeHead(response.statusCode, { ...headers, 'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'; base-uri 'self'", 'Cache-Control': 'no-store' });
    response.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '1' });
    res.end('Terminal is starting. Please reconnect shortly.');
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  if (!authorized(req)) {
    socket.end('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="AI Workspace"\r\nConnection: close\r\n\r\n'); return;
  }
  let sameOrigin = false;
  try {
    const origin = new URL(req.headers.origin);
    const host = process.env.RAILWAY_PUBLIC_DOMAIN || req.headers['x-forwarded-host'] || req.headers.host;
    sameOrigin = origin.host === host && ['https:', 'http:'].includes(origin.protocol);
  } catch { /* Cross-origin and missing-origin WebSockets are not allowed. */ }
  if (!sameOrigin) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  const terminal = terminalFor(req);
  if (!terminal || !new URL(req.url, 'http://localhost').pathname.endsWith('/ws')) {
    socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return;
  }
  const upstream = http.request({ hostname: '127.0.0.1', port: terminal.terminalPort, path: req.url,
    method: 'GET', headers: forwardedHeaders(req) });
  upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    const headers = Object.entries(response.headers).flatMap(([key, value]) =>
      Array.isArray(value) ? value.map(item => `${key}: ${item}`) : [`${key}: ${value}`]);
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headers.join('\r\n')}\r\n\r\n`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    socket.pipe(upstreamSocket); upstreamSocket.pipe(socket);
    socket.on('error', () => upstreamSocket.destroy());
    upstreamSocket.on('error', () => socket.destroy());
    socket.on('close', () => upstreamSocket.destroy());
    upstreamSocket.on('close', () => socket.destroy());
  });
  upstream.on('response', response => { response.resume(); socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'); });
  upstream.on('error', () => socket.destroy());
  socket.on('close', () => upstream.destroy());
  upstream.end();
});
server.headersTimeout = 30000;
server.requestTimeout = 30000;
server.listen(port, '0.0.0.0', () => console.log(`AI Workspace listening on ${port}. Authentication enabled.`));
function shutdown() {
  shuttingDown = true;
  for (const { child } of terminals.values()) child.kill('SIGTERM');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
