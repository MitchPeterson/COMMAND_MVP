#!/usr/bin/env node
// Cuts a release: bumps package.json and prepends the entry to
// src/lib/releaseNotes.ts, which the app reads as its version and changelog.
//
//   npm run release -- patch --title "Policy editing" "Edit any policy" "Fix duplicates"
//   npm run release -- minor --title "Coverage health" "Grades coverage against your household"
//
// Run it on the branch, commit the result with the work it describes. Every merge
// to main is a deploy, and every deploy should carry exactly one entry.
//
// Levels: patch for fixes and small changes, minor for something a user would
// notice, major only when the product itself changes. Major should be rare.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(root, 'package.json');
const notesPath = join(root, 'src/lib/releaseNotes.ts');

const die = (message) => {
  console.error(`\nrelease: ${message}\n`);
  process.exit(1);
};

// ── Arguments ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
let level = null;
let title = null;
const items = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--title' || arg === '-t') {
    title = argv[++i] ?? null;
  } else if (arg.startsWith('--title=')) {
    title = arg.slice('--title='.length);
  } else if (['major', 'minor', 'patch'].includes(arg) && level === null) {
    level = arg;
  } else if (arg.startsWith('-')) {
    die(`unknown option ${arg}`);
  } else {
    items.push(arg);
  }
}

if (!level) die('give a level: major, minor or patch');
if (!title) die('give a title: --title "What this release is"');
if (items.length === 0) die('give at least one item — a release with nothing to say is not a release');

// ── Version ──────────────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version;
const parts = current.split('.').map((n) => Number(n));
if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) {
  die(`package.json version "${current}" is not semver`);
}

let [major, minor, patch] = parts;
if (level === 'major') [major, minor, patch] = [major + 1, 0, 0];
else if (level === 'minor') [minor, patch] = [minor + 1, 0];
else patch += 1;
const next = `${major}.${minor}.${patch}`;

const notes = readFileSync(notesPath, 'utf8');
if (notes.includes(`version: '${next}'`)) die(`${next} is already in releaseNotes.ts`);

const newestInNotes = notes.match(/version: '([^']+)'/)?.[1];
if (newestInNotes && newestInNotes !== current) {
  die(
    `package.json is ${current} but the newest release note is ${newestInNotes}. ` +
      'Reconcile them before cutting a release.',
  );
}

// ── Write ────────────────────────────────────────────────────────────────────
// Local calendar date, not UTC — cutting a release on a US evening would
// otherwise be dated tomorrow.
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const escape = (text) => text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const entry =
  `  {\n` +
  `    version: '${next}',\n` +
  `    date: '${date}',\n` +
  `    title: '${escape(title)}',\n` +
  `    items: [\n` +
  items.map((item) => `      '${escape(item)}',\n`).join('') +
  `    ],\n` +
  `  },\n`;

const anchor = 'export const RELEASE_NOTES: ReleaseNote[] = [\n';
if (!notes.includes(anchor)) die('could not find RELEASE_NOTES in releaseNotes.ts');

writeFileSync(notesPath, notes.replace(anchor, anchor + entry), 'utf8');

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

console.log(`\nreleased ${current} → ${next}  ${title}`);
items.forEach((item) => console.log(`  · ${item}`));
console.log('\ncommit package.json and src/lib/releaseNotes.ts with the change.\n');
