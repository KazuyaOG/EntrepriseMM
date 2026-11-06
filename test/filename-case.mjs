// Garde-fou pour Windows : sur un système de fichiers insensible à la casse,
// deux fichiers dont les noms ne diffèrent que par la casse (ex. ExpenseReport.jsx
// et expenseReport.js) rendent les imports sans extension ambigus et cassent le build.
// Usage : node test/filename-case.mjs
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const roots = ['src', 'electron', 'test', 'build'];
const skip = new Set(['node_modules', 'dist', 'release', '.git']);
const files = [];

async function walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else files.push(full.replaceAll('\\', '/'));
  }
}

for (const root of roots) await walk(root);

// Un import './X' sans extension peut résoudre vers X.jsx, X.js, X.js ou X/index.js.
// On compare donc les noms de fichiers sans extension, en minuscules.
const byStem = new Map();
for (const file of files) {
  const stem = file.startsWith('src/') ? file.slice(0, file.lastIndexOf('.')) : file;
  const key = stem.toLowerCase();
  if (!byStem.has(key)) byStem.set(key, []);
  byStem.get(key).push(file);
}

const collisions = [...byStem.values()].filter(group => group.length > 1);
assert.deepEqual(
  collisions, [],
  `Noms de fichiers ambigus sur Windows (insensibilité à la casse) :\n${collisions.map(g => '  ' + g.join('  <->  ')).join('\n')}`
);
console.log(`PASS: ${files.length} fichier(s) vérifié(s), aucun nom ambigu sur Windows.`);
