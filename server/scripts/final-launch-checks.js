#!/usr/bin/env node
const fetch = global.fetch || require('node-fetch');
const base = process.env.APP_URL || 'http://localhost:5000';

async function check(path) {
  try {
    const res = await fetch(base + path, { method: 'GET' });
    const text = await res.text().catch(() => '');
    console.log(`${path} -> ${res.status}`);
    return { path, status: res.status, ok: res.ok, body: text.substring(0, 200) };
  } catch (err) {
    console.error(`${path} -> ERROR:`, err.message);
    return { path, status: 0, ok: false, error: err.message };
  }
}

async function run() {
  console.log('Running final launch checks against', base);
  const endpoints = ['/api/health', '/api/ready', '/api/auth/csrf', '/api/metrics'];
  const results = [];
  for (const ep of endpoints) {
    results.push(await check(ep));
  }
  console.log('Summary:');
  results.forEach(r => console.log(r));
  const ready = results.find(r => r.path === '/api/ready');
  process.exit(ready && ready.status === 200 ? 0 : 2);
}

run();
