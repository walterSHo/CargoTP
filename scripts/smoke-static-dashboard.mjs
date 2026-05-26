import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const screenshotDir = path.join('/private/tmp', 'cargotp-pages-smoke');

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].filter(Boolean);

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromeBinary() {
  for (const candidate of chromeCandidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error('Chrome/Chromium binary not found. Set CHROME_BIN to run static smoke checks.');
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    const requestPath = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const filePath = path.join(distDir, relativePath);

    try {
      const file = await fs.readFile(filePath);
      response.writeHead(200, { 'content-type': contentTypeFor(filePath) });
      response.end(file);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to resolve local smoke-check server port.');
  return { server, port: address.port };
}

async function runChrome(binary, args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `Chrome exited with code ${code}`));
    });
  });
}

await fs.access(path.join(distDir, 'index.html'));
await fs.mkdir(screenshotDir, { recursive: true });

const chromeBinary = await resolveChromeBinary();
const { server, port } = await startStaticServer();

try {
  const targetUrl = `http://127.0.0.1:${port}/index.html`;
  const desktopShot = path.join(screenshotDir, 'dashboard-desktop.png');
  const mobileShot = path.join(screenshotDir, 'dashboard-mobile.png');

  const { stdout } = await runChrome(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--virtual-time-budget=5000',
    '--dump-dom',
    targetUrl
  ]);

  const requiredMarkers = [
    'id="overview"',
    'id="sales"',
    'id="groups"',
    'id="receivables"',
    'data-table-filter-open="sales"',
    'data-search-mode="code"'
  ];

  const missingMarkers = requiredMarkers.filter((marker) => !stdout.includes(marker));
  if (missingMarkers.length) {
    throw new Error(`Static dashboard smoke check failed. Missing markers: ${missingMarkers.join(', ')}`);
  }

  await runChrome(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--virtual-time-budget=5000',
    '--window-size=1440,2800',
    `--screenshot=${desktopShot}`,
    targetUrl
  ]);

  await runChrome(chromeBinary, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--virtual-time-budget=5000',
    '--window-size=430,6200',
    `--screenshot=${mobileShot}`,
    targetUrl
  ]);

  console.log(`Static dashboard smoke check passed.`);
  console.log(`Desktop screenshot: ${desktopShot}`);
  console.log(`Mobile screenshot: ${mobileShot}`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
