// The live site document: the newest saved revision, or the navigation.js
// snapshot when nothing has been saved yet or the store can't be reached.
import { navigationData as snapshot } from '../../src/data/navigation.js';
import { toSiteDoc } from '../../src/data/siteDoc.js';
import { getStore } from './store.js';

let snapshotDoc = null;
export function getSnapshotDoc() {
  snapshotDoc ??= toSiteDoc(snapshot);
  return snapshotDoc;
}

// Per-instance cache, for callers that read the content on every request
let cached = null;

// { doc, revision, source: 'store' | 'snapshot' }. maxAgeMs > 0 reuses a
// recent result from this instance.
export async function liveSite({ maxAgeMs = 0 } = {}) {
  if (cached && Date.now() - cached.at < maxAgeMs) return cached;
  try {
    const row = await getStore().latest();
    if (row) {
      cached = { doc: row.data, revision: row.id, source: 'store', at: Date.now() };
      return cached;
    }
  } catch (error) {
    console.error('Couldn’t load the site content:', error.message);
  }
  return { doc: getSnapshotDoc(), revision: null, source: 'snapshot', at: Date.now() };
}
