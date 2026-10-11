import { navigationData } from '../data/navigation.js';

// Every page a visitor can open from the menu, flattened for site search.
// `section` is the trail of menus above a page, e.g. "Work / More". Fields sit
// where fuzzySearch looks for them: title, content.tags, content.description.
function buildSiteIndex() {
  const entries = [];
  const walk = (items, trail) => {
    for (const item of items) {
      if (item.hidden) continue;
      const content = item.content || {};
      entries.push({
        id: item.id,
        title: item.title,
        section: trail.join(' / '),
        content: {
          tags: content.tags || content.skills?.join(', ') || '',
          description: [content.description, content.headline, content.aboutText, content.location].filter(Boolean).join(' '),
        },
      });
      if (item.submenu) walk(item.submenu, [...trail, item.title]);
    }
  };
  walk(navigationData.mainMenu, []);
  return entries;
}

export const siteIndex = buildSiteIndex();
