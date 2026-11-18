// Map Animation Studio Cutroom-Compatible Local Studio Server
//   node serve.mjs          -> http://localhost:7403
//   node serve.mjs --lan    -> reachable on the same Wi-Fi
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const lan = process.argv.includes('--lan');
const port = +(process.env.PORT || process.env.PORT || 7403);
const bind = lan ? '0.0.0.0' : '127.0.0.1';
const defaultHtml = 'Data Chart Studio Pro.html';
const studioTitle = 'Data Chart Studio Pro';

const mediaDir = path.join(root, 'media');
const projectsDir = path.join(root, 'projects');
const outputsDir = path.join(root, 'outputs');
for (const d of [mediaDir, projectsDir, outputsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const lanUrls = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((x) => x && x.family === 'IPv4' && !x.internal)
    .map((x) => `http://${x.address}:${port}`);

const sendJson = (res, status, obj) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(obj));
};

const readBody = (req, limit = 150 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const listMediaItems = () => {
  if (!fs.existsSync(mediaDir)) return [];
  return fs
    .readdirSync(mediaDir)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const full = path.join(mediaDir, f);
      const st = fs.statSync(full);
      const ext = path.extname(f).toLowerCase();
      const kind = ['.mp4', '.webm', '.mov'].includes(ext)
        ? 'video'
        : ['.mp3', '.wav', '.ogg'].includes(ext)
        ? 'audio'
        : 'image';
      return {
        id: f,
        name: f,
        kind,
        size: st.size,
        mtime: st.mtimeMs,
        url: `/media/${encodeURIComponent(f)}`
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
};

const listOutputs = () => {
  if (!fs.existsSync(outputsDir)) return [];
  return fs
    .readdirSync(outputsDir)
    .filter((f) => !f.startsWith('.'))
    .map((f) => {
      const full = path.join(outputsDir, f);
      const st = fs.statSync(full);
      return {
        name: f,
        size: st.size,
        mtime: st.mtimeMs,
        url: `/outputs/${encodeURIComponent(f)}`
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
};

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    const u = new URL(req.url, `http://localhost:${port}`);
    let p = decodeURIComponent(u.pathname);

    if (p === '/api/health' || p === '/api/info') {
      return sendJson(res, 200, {
        ok: true,
        name: studioTitle,
        lan,
        urls: lan ? lanUrls() : [],
        port,
        ffmpeg: true
      });
    }

    if (p === '/api/media' && req.method === 'GET') {
      return sendJson(res, 200, { items: listMediaItems() });
    }

    if (p === '/api/media' && req.method === 'POST') {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString('utf8'));
        const safeName =
          String(body.name || `asset_${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const dataUrl = String(body.dataUrl || body.data || '');
        const m = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
        const buf = m ? Buffer.from(m[1], 'base64') : Buffer.from(dataUrl, 'base64');
        fs.writeFileSync(path.join(mediaDir, safeName), buf);
        return sendJson(res, 200, {
          ok: true,
          item: {
            id: safeName,
            name: safeName,
            size: buf.length,
            url: `/media/${encodeURIComponent(safeName)}`
          }
        });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: String(e.message || e) });
      }
    }

    if (p.startsWith('/api/media/') && req.method === 'DELETE') {
      const name = path.basename(p.slice('/api/media/'.length));
      const target = path.join(mediaDir, name);
      if (fs.existsSync(target)) fs.unlinkSync(target);
      return sendJson(res, 200, { ok: true });
    }

    if (p === '/api/outputs' && req.method === 'GET') {
      return sendJson(res, 200, { files: listOutputs() });
    }

    if (p === '/api/projects' && req.method === 'GET') {
      const files = fs
        .readdirSync(projectsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
          name: f.replace(/\.json$/, ''),
          file: f,
          mtime: fs.statSync(path.join(projectsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);
      return sendJson(res, 200, { projects: files });
    }

    if (p === '/api/projects' && req.method === 'POST') {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString('utf8'));
        const safe = String(body.name || 'project').replace(/[^a-zA-Z0-9._-]/g, '_') + '.json';
        fs.writeFileSync(path.join(projectsDir, safe), JSON.stringify(body.project ?? body, null, 2));
        return sendJson(res, 200, { ok: true, file: safe });
      } catch (e) {
        return sendJson(res, 400, { ok: false, error: String(e.message || e) });
      }
    }

    if (p === '/api/reveal' && req.method === 'POST') {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw.toString('utf8') || '{}');
        const target = body.file ? path.join(outputsDir, path.basename(body.file)) : outputsDir;
        if (process.platform === 'win32') spawn('explorer.exe', [target], { detached: true });
        else if (process.platform === 'darwin') spawn('open', [-R, target], { detached: true });
        else spawn('xdg-open', [path.dirname(target)], { detached: true });
      } catch {}
      return sendJson(res, 200, { ok: true });
    }

    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }

    const rel = p.replace(/^\/+/, '') || defaultHtml;
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const mime = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache');
    if (req.method === 'HEAD') return res.end();

    if (/gzip/.test(req.headers['accept-encoding'] || '') && /text|javascript|json|svg/.test(mime)) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    } else {
      fs.createReadStream(file).pipe(res);
    }
  })
  .listen(port, bind, () => {
    console.log(`${studioTitle}\nLaptop: http://localhost:${port}`);
    if (lan) console.log(`Phone (same Wi-Fi):\n${lanUrls().join('\n')}`);
  });
