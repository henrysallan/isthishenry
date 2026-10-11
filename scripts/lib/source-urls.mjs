// Shared by the scripts that move the site's media to new URLs: swap URL
// literals in the source, and resolve navigation.js the way ContentArea does.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CDN_ORIGIN = 'https://cdn.isthishenry.com';
const MEDIA_FILE = /\.(png|jpe?g|gif|webp|avif|svg|mp4|mov|webm|m4v|m3u8)$/i;

async function listSourceFiles(root) {
  const files = [path.join(root, 'index.html')];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_archive')) await walk(full);
      } else if (/\.(jsx?|html)$/.test(entry.name)) files.push(full);
    }
  }
  await walk(path.join(root, 'src'));
  return files;
}

// Replaces quoted occurrences ('…', "…", `…`) of each mapping's URL with `to`,
// in index.html and src/. mappings: [{ from, relative, to }], where `relative`
// is the bare filename navigation.js uses for block srcs under a page's baseUrl.
// Returns the original text of every changed file, for restore().
export async function rewriteSourceUrls(root, mappings, { dryRun = false } = {}) {
  const shared = new Map();
  for (const m of mappings.filter((m) => m.relative)) {
    if (shared.has(m.relative)) throw new Error(`Two files are both named ${m.relative}; can't rewrite relative srcs safely`);
    shared.set(m.relative, m);
  }

  const navigationFile = path.join(root, 'src/data/navigation.js');
  const originals = new Map();
  for (const file of await listSourceFiles(root)) {
    const original = await readFile(file, 'utf8');
    let text = original;
    let count = 0;
    for (const m of mappings) {
      const literals = new Set([m.from, decodeURI(m.from)]);
      if (file === navigationFile && m.relative) literals.add(m.relative).add(encodeURI(m.relative));
      for (const literal of literals) {
        for (const q of ["'", '"', '`']) {
          const parts = text.split(q + literal + q);
          count += parts.length - 1;
          text = parts.join(q + m.to + q);
        }
      }
    }
    if (count) {
      originals.set(file, original);
      console.log(`  ${path.relative(root, file)}: ${count} URLs`);
      if (!dryRun) await writeFile(file, text);
    }
  }
  return originals;
}

export async function restore(originals) {
  for (const [file, text] of originals) await writeFile(file, text);
}

// Every URL navigation.js resolves to, with a page's baseUrl applied to its
// relative media paths. Imported fresh, so it reflects a rewrite just made.
export async function navigationUrls(root) {
  const file = pathToFileURL(path.join(root, 'src/data/navigation.js')).href;
  const { navigationData } = await import(`${file}?t=${Date.now()}`);
  const urls = [];
  (function walk(node, baseUrl) {
    if (typeof node === 'string') {
      if (/^https?:/.test(node)) urls.push(node);
      else if (baseUrl && MEDIA_FILE.test(node)) urls.push(baseUrl + node);
      return;
    }
    if (node && typeof node === 'object') {
      const nextBase = typeof node.baseUrl === 'string' ? node.baseUrl : baseUrl;
      for (const [key, value] of Object.entries(node)) if (key !== 'baseUrl') walk(value, nextBase);
    }
  })(navigationData, null);
  return urls;
}
