import { toSiteDoc } from './siteDoc.js';

// The site's content, filled in once before anything renders (main.jsx on the
// client, api/site.js and api/ask.js on the server). Everything that reads pages
// or the menu imports this object; it's mutated in place so those imports stay
// live.
export const navigationData = { version: 0, home: null, mainMenu: [] };

export function setSite(doc) {
  Object.assign(navigationData, doc);
}

// The navigation.js snapshot bundled with the code, used when the live content
// can't be loaded. Imported on demand so the public bundle doesn't carry it.
export async function snapshotDoc() {
  const { navigationData: snapshot } = await import('./navigation.js');
  return toSiteDoc(snapshot);
}
