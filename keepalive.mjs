// keepalive.mjs — Auto-restart Next.js dev server on OOM/crash
import { spawn } from 'child_process';
import { writeFileSync, appendFileSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = __dirname;
const LOG_FILE = join(PROJECT_DIR, 'dev.log');
const MAX_RESTARTS = 200;
const COOLDOWN_MS = 8000;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { appendFileSync(LOG_FILE, line); } catch {}
}

async function startServer() {
  return new Promise((resolve) => {
    // Clear Turbopack cache
    try { rmSync(join(PROJECT_DIR, '.next', 'cache'), { recursive: true, force: true }); } catch {}

    const child = spawn(
      process.execPath,
      [join(PROJECT_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '3000'],
      {
        cwd: PROJECT_DIR,
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=768' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Stream output to log file
    child.stdout.on('data', (data) => {
      const text = data.toString();
      try { appendFileSync(LOG_FILE, text); } catch {}
    });
    child.stderr.on('data', (data) => {
      const text = data.toString();
      try { appendFileSync(LOG_FILE, text); } catch {}
    });

    child.on('exit', (code) => {
      resolve(code);
    });

    child.on('error', (err) => {
      log(`spawn error: ${err.message}`);
      resolve(-1);
    });
  });
}

async function main() {
  log('keepalive.mjs started');
  for (let i = 1; i <= MAX_RESTARTS; i++) {
    log(`starting server (restart #${i})`);
    const code = await startServer();
    log(`server exited (code=${code})`);
    if (i < MAX_RESTARTS) {
      await new Promise(r => setTimeout(r, COOLDOWN_MS));
    }
  }
  log(`max restarts (${MAX_RESTARTS}) reached`);
}

main();