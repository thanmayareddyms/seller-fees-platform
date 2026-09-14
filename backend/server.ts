import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { store } from './store';
import type { DashboardFilters } from './types';

const PORT = Number(process.env.PORT ?? 3000);
const root = join(process.cwd(), 'frontend');
const clients = new Set<ServerResponse>();

function sendJson(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

function filters(req: IncomingMessage): DashboardFilters {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  return {
    period: (url.searchParams.get('period') as DashboardFilters['period']) ?? 'today',
    date: url.searchParams.get('date') ?? undefined,
    auditor: url.searchParams.get('auditor') ?? undefined
  };
}

async function staticFile(req: IncomingMessage, res: ServerResponse) {
  const requested = req.url === '/' ? '/index.html' : (req.url ?? '/index.html').split('?')[0];
  const safe = normalize(requested).replace(/^([.][.][/\\])+/, '');
  const file = join(root, safe);
  try {
    const body = await readFile(file);
    const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'text/plain' });
    res.end(body);
  } catch {
    sendJson(res, { error: 'Not found' }, 404);
  }
}

createServer(async (req, res) => {
  if (req.url?.startsWith('/api/dashboard')) {
    sendJson(res, store.dashboard(filters(req)));
    return;
  }
  if (req.url === '/api/health') {
    sendJson(res, { status: 'ok', geoEditor: store.integrationStatus() });
    return;
  }
  if (req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store', Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify(store.dashboard())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  await staticFile(req, res);
}).listen(PORT, () => console.log(`Audit Metric running on http://localhost:${PORT}`));

// The approved Geo Editor adapter will call store.applyGeoEditorEvent().
store.onChange(() => {
  const data = `data: ${JSON.stringify(store.dashboard())}\n\n`;
  for (const client of clients) client.write(data);
});
