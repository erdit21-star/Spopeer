const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const inlineDir = path.join(publicDir, 'js', 'inline');

function walkHtmlFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(abs, out);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      out.push(abs);
    }
  }
  return out;
}

function sanitizeBaseName(relPath) {
  return relPath
    .replace(/\\/g, '/')
    .replace(/^public\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.html$/i, '')
    .toLowerCase();
}

function isNonJsScript(attrs) {
  const match = String(attrs || '').match(/\btype\s*=\s*(["'])(.*?)\1/i);
  if (!match) return false;
  const typeValue = String(match[2] || '').toLowerCase().trim();
  if (!typeValue) return false;
  if (typeValue === 'text/javascript' || typeValue === 'application/javascript' || typeValue === 'module') {
    return false;
  }
  return true;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function externalizeInlineScriptsInFile(htmlPath) {
  const original = fs.readFileSync(htmlPath, 'utf8');
  const rel = path.relative(repoRoot, htmlPath).replace(/\\/g, '/');
  const base = sanitizeBaseName(rel);
  let index = 0;
  let changed = false;
  const created = [];

  const scriptRegex = /<script\b(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi;
  const updated = original.replace(scriptRegex, (full, attrs, body) => {
    if (isNonJsScript(attrs)) {
      return full;
    }

    const jsBody = String(body || '');
    if (!jsBody.trim()) {
      return full;
    }

    index += 1;
    changed = true;
    const fileName = `${base}-inline-${index}.js`;
    const absJs = path.join(inlineDir, fileName);
    const srcPath = `/js/inline/${fileName}`;

    fs.writeFileSync(absJs, `${jsBody.trim()}\n`, 'utf8');
    created.push(srcPath);

    return `<script src="${srcPath}"></script>`;
  });

  if (changed && updated !== original) {
    fs.writeFileSync(htmlPath, updated, 'utf8');
  }

  return { changed, rel, created };
}

function main() {
  ensureDir(inlineDir);
  const htmlFiles = walkHtmlFiles(publicDir);
  let changedFiles = 0;
  let createdFiles = 0;
  const details = [];

  for (const file of htmlFiles) {
    const result = externalizeInlineScriptsInFile(file);
    if (!result.changed) continue;
    changedFiles += 1;
    createdFiles += result.created.length;
    details.push(result);
  }

  console.log(`Changed HTML files: ${changedFiles}`);
  console.log(`Created JS files: ${createdFiles}`);
  for (const d of details) {
    console.log(`- ${d.rel} (${d.created.length})`);
  }
}

main();
