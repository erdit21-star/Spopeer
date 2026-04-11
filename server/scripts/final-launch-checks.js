#!/usr/bin/env node
const fetch = global.fetch || require('node-fetch');
const { exec } = require('child_process');
const base = process.env.APP_URL || 'http://localhost:5000';

async function check(path, method = 'GET', body) {
  try {
    const opts = { method, headers: {} };
    if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(base + path, opts);
    const text = await res.text().catch(() => '');
    console.log(`${path} -> ${res.status}`);
    return { path, status: res.status, ok: res.ok, body: text.substring(0, 200) };
  } catch (err) {
    console.error(`${path} -> ERROR:`, err && err.message);
    return { path, status: 0, ok: false, error: err && err.message };
  }
}

function runCommand(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return resolve({ ok: false, error: err.message, stdout, stderr });
      return resolve({ ok: true, stdout: String(stdout || '').substring(0, 200), stderr: String(stderr || '').substring(0, 200) });
    });
  });
}

async function run() {
  console.log('Running final launch checks against', base);
  const endpoints = ['/api/health', '/api/ready', '/api/auth/csrf', '/api/metrics'];
  const results = [];
  for (const ep of endpoints) {
    results.push(await check(ep));
  }

  // Email send smoke: trigger forgot-password for a test address (won't reveal mailbox existence)
  try {
    const emailTest = await check('/api/auth/forgot-password', 'POST', JSON.stringify({ email: 'noreply-test@localhost' }));
    results.push(emailTest);
  } catch (e) {
    results.push({ path: '/api/auth/forgot-password', ok: false, error: e && e.message });
  }

  // Migration status via sequelize-cli
  try {
    const migrate = await runCommand('npx sequelize-cli db:migrate:status', process.cwd());
    results.push({ path: 'migrate:status', ok: migrate.ok, output: migrate.stdout, error: migrate.error || migrate.stderr });
  } catch (e) {
    results.push({ path: 'migrate:status', ok: false, error: e && e.message });
  }

  console.log('Summary:');
  results.forEach(r => console.log(r));
  const ready = results.find(r => r.path === '/api/ready');
  const migrateOk = results.find(r => r.path === 'migrate:status');
  const allOk = (ready && ready.status === 200) && (migrateOk && migrateOk.ok);
  process.exit(allOk ? 0 : 2);
}

run();
