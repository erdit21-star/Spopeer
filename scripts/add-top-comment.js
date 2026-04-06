// Updated
/*
  add-top-comment.js
  Safely prepend a single-line comment to many text files (skips JSON).
  Run from repository root: node scripts/add-top-comment.js
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTS = {
  js: { open: '// ', close: '' },
  mjs: { open: '// ', close: '' },
  cjs: { open: '// ', close: '' },
  ts: { open: '// ', close: '' },
  html: { open: '<!-- ', close: ' -->' },
  htm: { open: '<!-- ', close: ' -->' },
  css: { open: '/* ', close: ' */' },
  md: { open: '<!-- ', close: ' -->' },
  txt: { open: '<!-- ', close: ' -->' },
  yml: { open: '# ', close: '' },
  yaml: { open: '# ', close: '' },
  env: { open: '# ', close: '' },
  sh: { open: '# ', close: '' },
  conf: { open: '# ', close: '' },
  ini: { open: '# ', close: '' },
  htaccess: { open: '# ', close: '' }
};

const IGNORES = ['node_modules', '.git', '.github', 'dist', 'build'];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const rel = path.relative(ROOT, full);
    if (IGNORES.some(i => rel.split(path.sep)[0] === i)) continue;
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function shouldProcess(file) {
  const ext = path.extname(file).replace('.', '').toLowerCase();
  if (!ext) return false;
  if (ext === 'json') return false; // skip json
  return Object.prototype.hasOwnProperty.call(EXTS, ext);
}

function processFile(file) {
  const ext = path.extname(file).replace('.', '').toLowerCase();
  const comment = EXTS[ext];
  if (!comment) return false;
  let content = fs.readFileSync(file, 'utf8');
  // skip binary files heuristics
  if (content.indexOf('\0') !== -1) return false;
  const firstLine = content.split(/\r?\n/, 1)[0] || '';
  if (firstLine.includes('Updated')) return false; // already annotated
  const note = comment.open + 'Updated' + (comment.close ? ' ' + comment.close : '');
  const newContent = note + '\n' + content;
  fs.writeFileSync(file, newContent, 'utf8');
  return true;
}

function main() {
  console.log('Scanning files...');
  const files = walk(ROOT);
  let changed = 0;
  for (const f of files) {
    try {
      if (shouldProcess(f)) {
        if (processFile(f)) {
          console.log('Updated:', path.relative(ROOT, f));
          changed++;
        }
      }
    } catch (e) {
      console.error('Error processing', f, e.message);
    }
  }
  console.log(`Done. Files updated: ${changed}`);
}

main();
