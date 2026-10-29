// Tiny static server for dist/ (no dependencies). PORT env var overrides 5173.
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.jsx': 'text/plain; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.zip': 'application/zip', '.lottie': 'application/zip', '.swift': 'text/plain; charset=utf-8',
  '.kt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.riv': 'application/octet-stream',
};

const repo = fileURLToPath(new URL('../', import.meta.url));

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // Local-only study routes: the Rive viewer and the third-party .riv files in the repo root. Never part of dist/.
  if (url === '/riv-list') {
    const files = (await readdir(repo)).filter((f) => f.endsWith('.riv'));
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(files));
    return;
  }
  const local = url.startsWith('/riv/') && url.endsWith('.riv') ? join(repo, basename(url)) : url === '/tools/riv-viewer' ? join(repo, 'tools/riv-viewer.html') : null;
  let file = local ?? normalize(join(root, url));
  if (!local && !file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(port, () => console.log(`Plush Motion → http://localhost:${port}`));
