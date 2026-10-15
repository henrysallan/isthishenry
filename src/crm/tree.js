// Page-level operations on the site document for the editor. Like layout.js,
// each returns a new document, copying only the path to what changed.
import { findItem, slugify, walkItems } from '../data/siteDoc';

function mapItems(items, id, fn) {
  let changed = false;
  const next = items.map((item) => {
    if (item.id === id) {
      changed = true;
      return fn(item);
    }
    if (item.submenu) {
      const submenu = mapItems(item.submenu, id, fn);
      if (submenu !== item.submenu) {
        changed = true;
        return { ...item, submenu };
      }
    }
    return item;
  });
  return changed ? next : items;
}

export const updateItem = (doc, id, fn) => ({ ...doc, mainMenu: mapItems(doc.mainMenu, id, fn) });

export const updateContent = (doc, id, fn) =>
  updateItem(doc, id, (item) => ({ ...item, content: fn(item.content || {}) }));

// Applies fn to the list (mainMenu or a submenu) that holds the item
function updateSiblings(doc, id, fn) {
  const parent = findItem(doc, id)?.trail.at(-1);
  if (!parent) return { ...doc, mainMenu: fn(doc.mainMenu) };
  return updateItem(doc, parent.id, (item) => ({ ...item, submenu: fn(item.submenu) }));
}

// Every editable page, with the menus above it, e.g. { id, title, section: 'Work / More' }
export function listPages(doc) {
  const pages = [];
  walkItems(doc.mainMenu, (item, trail) => {
    if (item.type === 'page') pages.push({ id: item.id, title: item.title, section: trail.map((t) => t.title).join(' / ') });
  });
  return pages;
}

// Menus a new page can go in: top level, or any submenu
export function listSections(doc) {
  const sections = [{ id: null, title: 'Top level' }];
  walkItems(doc.mainMenu, (item, trail) => {
    if (item.type === 'submenu') sections.push({ id: item.id, title: [...trail, item].map((t) => t.title).join(' / ') });
  });
  return sections;
}

export function uniqueId(doc, base) {
  const taken = new Set(['home', 'crm', 'api']);
  walkItems(doc.mainMenu, (item) => taken.add(item.id));
  let id = slugify(base);
  for (let n = 2; taken.has(id); n++) id = `${slugify(base)}-${n}`;
  return id;
}

// A new, empty case study page at the top of a section. Returns [doc, id].
export function addPage(doc, { title, sectionId }) {
  const id = uniqueId(doc, title);
  const page = {
    id,
    title,
    type: 'page',
    content: { title, year: String(new Date().getFullYear()), tags: '', description: '', rows: [] },
  };
  if (!sectionId) return [{ ...doc, mainMenu: [page, ...doc.mainMenu] }, id];
  return [updateItem(doc, sectionId, (item) => ({ ...item, submenu: [page, ...(item.submenu || [])] })), id];
}

export function removePage(doc, id) {
  return updateSiblings(doc, id, (items) => items.filter((item) => item.id !== id));
}

// Moves a page up (-1) or down (+1) among the items in its menu
export function movePage(doc, id, delta) {
  return updateSiblings(doc, id, (items) => {
    const index = items.findIndex((item) => item.id === id);
    const to = index + delta;
    if (index < 0 || to < 0 || to >= items.length) return items;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });
}

// A short summary of what changed between two documents, for the revision note
export function describeChanges(before, after) {
  const pages = (doc) => {
    const map = new Map();
    walkItems(doc?.mainMenu, (item) => map.set(item.id, item));
    return map;
  };
  const old = pages(before);
  const next = pages(after);
  const titles = (ids, map) => ids.map((id) => map.get(id).title).join(', ');
  const added = [...next.keys()].filter((id) => !old.has(id));
  const removed = [...old.keys()].filter((id) => !next.has(id));
  // A page, leaving out the pages under it (they're compared on their own)
  const own = (item) => JSON.stringify({ ...item, submenu: undefined });
  const edited = [...next.keys()].filter((id) => old.has(id) && own(old.get(id)) !== own(next.get(id)));
  const parts = [];
  if (edited.length) parts.push(`Edited ${titles(edited, next)}`);
  if (added.length) parts.push(`Added ${titles(added, next)}`);
  if (removed.length) parts.push(`Removed ${titles(removed, old)}`);
  if (!parts.length) parts.push('Reordered the menu');
  return parts.join('; ');
}
