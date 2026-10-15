// The site document: every page, menu entry and media block, as stored in
// Supabase (one row per saved revision) and served by /api/site.
//
//   { version: 2, home: {...}, mainMenu: [...] }
//
// Same shape as src/data/navigation.js, except that a page's media sits in
// rows on a 12-column grid instead of one flat list:
//
//   content.rows = [{ id, blocks: [{ id, type, src, colStart, colSpan, ... }] }]
//
// Blocks in a row never overlap and are kept in colStart order (phones stack
// them in that order). Block types: image, video, vimeo, text.

export const DOC_VERSION = 2;
export const GRID_COLUMNS = 12;

export const newId = (prefix) => `${prefix}${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Splits a flat block list into rows the way CSS grid auto-placement did on
// the old single 12-column grid: a block whose start column is left of where
// the previous one ended opens a new row.
export function blocksToRows(blocks, baseUrl = '') {
  const rows = [];
  let row = null;
  let nextColumn = Infinity;
  for (const block of blocks) {
    const colStart = clamp(Math.round(block.colStart) || 1, 1, GRID_COLUMNS);
    const colSpan = clamp(Math.round(block.colSpan) || GRID_COLUMNS, 1, GRID_COLUMNS + 1 - colStart);
    if (!row || colStart < nextColumn) {
      row = { id: newId('r'), blocks: [] };
      rows.push(row);
    }
    const migrated = { id: newId('b'), ...block, colStart, colSpan };
    if (migrated.src && !/^https?:\/\//.test(migrated.src)) migrated.src = `${baseUrl}${migrated.src}`;
    row.blocks.push(migrated);
    nextColumn = colStart + colSpan;
  }
  return rows;
}

// Every menu item in the tree, depth first, with the trail of menus above it
export function walkItems(items, visit, trail = []) {
  for (const item of items || []) {
    visit(item, trail);
    if (item.submenu) walkItems(item.submenu, visit, [...trail, item]);
  }
}

// A document in the current shape, from either an older document or the
// navigation.js snapshot. Doesn't modify its input.
export function toSiteDoc(data) {
  const doc = structuredClone(data);
  if (doc.version === DOC_VERSION) return doc;
  walkItems(doc.mainMenu, (item) => {
    const content = item.content;
    if (!content?.blocks) return;
    content.rows = blocksToRows(content.blocks, content.baseUrl);
    delete content.blocks;
  });
  return { version: DOC_VERSION, home: doc.home, mainMenu: doc.mainMenu };
}

// A page's blocks in reading order
export function pageBlocks(content) {
  return (content?.rows || []).flatMap((row) => row.blocks);
}

export function findItem(doc, id) {
  let found = null;
  walkItems(doc.mainMenu, (item, trail) => {
    if (!found && item.id === id) found = { item, trail };
  });
  return found;
}

export const isVideoSrc = (src) => /\.(mp4|mov|webm|m3u8)(\?|#|$)/i.test(src || '');

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'page';
}

// Problems that would break the site if this document went live. Empty when
// it's fine to publish.
export function validateDoc(doc) {
  const errors = [];
  if (!doc || typeof doc !== 'object') return ['Not a site document'];
  if (doc.version !== DOC_VERSION) errors.push(`Expected version ${DOC_VERSION}`);
  if (!doc.home?.content) errors.push('Missing home page');
  if (!Array.isArray(doc.mainMenu)) return [...errors, 'Missing menu'];
  const ids = new Set(['home']);
  walkItems(doc.mainMenu, (item) => {
    if (!item.id || !/^[a-z0-9-]+$/.test(item.id)) errors.push(`Bad page id "${item.id}"`);
    else if (ids.has(item.id)) errors.push(`Two pages use the id "${item.id}"`);
    ids.add(item.id);
    for (const row of item.content?.rows || []) {
      let end = 0;
      for (const block of row.blocks || []) {
        const { colStart, colSpan } = block;
        const valid = Number.isInteger(colStart) && Number.isInteger(colSpan)
          && colStart >= 1 && colSpan >= 1 && colStart + colSpan - 1 <= GRID_COLUMNS;
        if (!valid) errors.push(`${item.id}: block ${block.id} is off the grid`);
        else if (colStart <= end) errors.push(`${item.id}: blocks overlap in row ${row.id}`);
        else end = colStart + colSpan - 1;
      }
    }
  });
  return errors;
}
