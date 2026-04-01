/**
 * Syntax check all JavaScript files in the project.
 * Run as: node scripts/syntax-check.js
 * Exit code 1 if any file fails parsing.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const dirs = [
  path.join(ROOT, 'public', 'js'),
  path.join(ROOT, 'public', 'pages'),
  path.join(ROOT, 'server'),
  path.join(ROOT, 'scripts')
];

let failed = 0;
let checked = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'uploads') continue;
      files = files.concat(walk(full));
    } else if (entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = dirs.flatMap(walk);

for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    checked++;
  } catch (err) {
    console.error(`FAIL: ${path.relative(ROOT, file)}`);
    console.error(err.stderr?.toString() || err.message);
    failed++;
  }
}

console.log(`\nSyntax check: ${checked} passed, ${failed} failed out of ${checked + failed} files.`);

if (failed > 0) {
  process.exit(1);
}
