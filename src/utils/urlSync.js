import { navigationData } from '../data/navigation';

/**
 * URL ↔ Navigation State sync utility
 *
 * URL structure:
 *   /                        → home
 *   /about                   → about page
 *   /projects                → projects page
 *   /contact                 → contact page
 *   /work                    → work submenu grid
 *   /work/expensify          → work subpage
 *   /work/more               → nested "More" grid
 *   /work/more/sketches      → nested subpage inside More
 */

// ── Build lookup tables from navigation data ──

// Map of page/submenu id → url path segments
// We walk the tree once at import time so lookups are O(1).

const idToPath = {};   // e.g. { 'expensify': '/work/expensify', 'sketches': '/work/more/sketches' }
const pathToRoute = {}; // reverse: path string → route info

function buildRoutes() {
  // Home
  idToPath['home'] = '/';
  pathToRoute['/'] = { type: 'home' };

  // Walk mainMenu items
  for (const item of navigationData.mainMenu) {
    if (item.type === 'submenu') {
      // Submenu landing (e.g. /work)
      const submenuPath = `/${item.id}`;
      idToPath[item.id] = submenuPath;
      pathToRoute[submenuPath] = {
        type: 'submenu',
        submenuId: item.id
      };

      // Submenu children
      if (item.submenu) {
        for (const child of item.submenu) {
          if (child.type === 'submenu') {
            // Nested submenu (e.g. "More" inside Work) → /work/more
            const nestedPath = `/${item.id}/${child.id}`;
            idToPath[child.id] = nestedPath;
            pathToRoute[nestedPath] = {
              type: 'nestedSubmenu',
              submenuId: item.id,
              nestedSubmenuId: child.id
            };

            // Nested submenu children (e.g. /work/more/sketches)
            if (child.submenu) {
              for (const nested of child.submenu) {
                const deepPath = `/${item.id}/${child.id}/${nested.id}`;
                idToPath[nested.id] = deepPath;
                pathToRoute[deepPath] = {
                  type: 'nestedSubpage',
                  submenuId: item.id,
                  nestedSubmenuId: child.id,
                  pageId: nested.id
                };
              }
            }
          } else {
            // Direct subpage (e.g. /work/expensify)
            const childPath = `/${item.id}/${child.id}`;
            idToPath[child.id] = childPath;
            pathToRoute[childPath] = {
              type: 'subpage',
              submenuId: item.id,
              pageId: child.id
            };
          }
        }
      }
    } else if (item.type === 'page') {
      // Top-level page (e.g. /about, /projects)
      const pagePath = `/${item.id}`;
      idToPath[item.id] = pagePath;
      pathToRoute[pagePath] = {
        type: 'page',
        pageId: item.id
      };
    }
  }
}

buildRoutes();

// ── Public API ──

/**
 * Convert the current URL pathname into a navigation state object
 * that can be spread into the Zustand store.
 * Returns null if the path is "/" (home / default).
 */
export function resolveUrlToState(pathname) {
  // Normalize: strip trailing slash (but keep "/" as is)
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const route = pathToRoute[path];

  if (!route) return null; // unknown path → fall through to home

  switch (route.type) {
    case 'home':
      return null; // use default store state

    case 'page':
      return {
        currentView: route.pageId,
        currentMenu: 'main',
        activeMenuItem: route.pageId,
        expandedSubmenuId: null,
        expandedNestedSubmenuId: null,
        parentView: null
      };

    case 'submenu':
      return {
        currentView: route.submenuId,
        currentMenu: route.submenuId,
        activeMenuItem: route.submenuId,
        expandedSubmenuId: route.submenuId,
        expandedNestedSubmenuId: null,
        parentView: null
      };

    case 'subpage':
      return {
        currentView: route.pageId,
        currentMenu: route.submenuId,
        activeMenuItem: route.pageId,
        expandedSubmenuId: route.submenuId,
        expandedNestedSubmenuId: null,
        parentView: null
      };

    case 'nestedSubmenu':
      return {
        currentView: route.nestedSubmenuId,
        currentMenu: route.submenuId,
        activeMenuItem: route.nestedSubmenuId,
        expandedSubmenuId: route.submenuId,
        expandedNestedSubmenuId: route.nestedSubmenuId,
        parentView: null
      };

    case 'nestedSubpage':
      return {
        currentView: route.pageId,
        currentMenu: route.submenuId,
        activeMenuItem: route.nestedSubmenuId,
        expandedSubmenuId: route.submenuId,
        expandedNestedSubmenuId: route.nestedSubmenuId,
        parentView: route.nestedSubmenuId
      };

    default:
      return null;
  }
}

/**
 * Given a currentView id, return the URL path to push.
 */
export function stateToUrl(currentView) {
  if (!currentView || currentView === 'home') return '/';
  return idToPath[currentView] || '/';
}

/**
 * Push a new URL into the browser history (no page reload).
 * Skips if the path is already current.
 */
export function pushUrl(currentView) {
  const path = stateToUrl(currentView);
  if (window.location.pathname !== path) {
    window.history.pushState({ currentView }, '', path);
  }
}

/**
 * Replace the current URL (used on initial load so we don't add
 * an extra history entry).
 */
export function replaceUrl(currentView) {
  const path = stateToUrl(currentView);
  if (window.location.pathname !== path) {
    window.history.replaceState({ currentView }, '', path);
  }
}

/**
 * Returns true if the current URL is a deep link (not home).
 */
export function isDeepLink() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path !== '/';
}
