import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const root = join(process.cwd(), 'frontend');

type Auditor = { name: string; completed: number; active: number; expired: number; reverted: number; quality: number; auditMinutes: number };
type Snapshot = { updatedAt: string; totalCompleted: number; inProgress: number; expired: number; reverted: number; totalAuditMinutes: number; quality: number; auditors: Auditor[] };

const auditors: Auditor[] = [
  { name: 'Tanmaya', completed: 18, active: 1, expired: 0, reverted: 1, quality: 98.2, auditMinutes: 184 },
  { name: 'Ananya', completed: 24, active: 1, expired: 1, reverted: 2, quality: 97.4, auditMinutes: 241 },
  { name: 'Rahul', completed: 21, active: 0, expired: 0, reverted: 1, quality: 99.1, auditMinutes: 213 },
  { name: 'Priya', completed: 27, active: 1, expired: 0, reverted: 0, quality: 98.7, auditMinutes: 266 },
];

const snapshot = (): Snapshot => ({
  updatedAt: new Date().toISOString(),
  totalCompleted: auditors.reduce((n, a) => n + a.completed, 0),
  inProgress: auditors.reduce((n, a) => n + a.active, 0),
  expired: auditors.reduce((n, a) => n + a.expired, 0),
  reverted: auditors.reduce((n, a) => n + a.reverted, 0),
  totalAuditMinutes: auditors.reduce((n, a) => n + a.auditMinutes, 0),
  quality: Number((auditors.reduce((n, a) => n + a.quality, 0) / auditors.length).toFixed(1)),
  auditors,
});

const clients = new Set<ServerResponse>();
setInterval(() => {
  // Demo live heartbeat. Replace this adapter with the approved Geo Editor event/API source.
  for (const a of auditors) {
    if (a.active && Math.random() > 0.72) { a.completed += 1; a.auditMinutes += 8 + Math.floor(Math.random() * 5); }
  }
  const data = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of clients) res.write(data);
}, 5000);

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const requested = req.url === '/' ? '/index.html' : req.url ?? '/index.html';
  const safe = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(root, safe);
  try {
    const body = await readFile(file);
    const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

createServer(async (req, res) => {
  if (req.url === '/api/dashboard') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(snapshot())); return;
  }
  if (req.url === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'Access-Control-Allow-Origin': '*' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`); clients.add(res);
    req.on('close', () => clients.delete(res)); return;
  }
  await serveStatic(req, res);
}).listen(PORT, () => console.log(`Dashboard running on http://localhost:${PORT}`));
