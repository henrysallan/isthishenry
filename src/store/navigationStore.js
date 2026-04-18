import { create } from 'zustand';
import { resolveUrlToState, pushUrl, replaceUrl, isDeepLink } from '../utils/urlSync';

// Always use light mode (classic theme)

export const useNavigationStore = create((set, get) => ({
  // Current view state - start on home page
  currentView: 'home', // 'home' or page id
  currentMenu: 'main', // 'main' or the id of expanded submenu parent
  activeMenuItem: 'home',
  expandedSubmenuId: null, // ID of the menu item whose submenu is currently expanded
  expandedNestedSubmenuId: null, // ID of nested submenu (e.g. "More" inside Work)
  parentView: null, // For nested grids: the intermediate page to return to on go-back
  isHoveringMenuItem: false, // Track if hovering over any menu item
  isHoveringLogo: false, // Track if hovering over logo letters
  currentTheme: 'classic', // Active color theme
  isThemeInverted: false, // Always light mode
  isLandingDismissed: false, // Track if landing page has been dismissed
  
  // Internal flag: when true, the URL subscriber skips pushing
  _skipUrlPush: false,

  // Landing page actions
  setLandingDismissed: (isDismissed) => set({ isLandingDismissed: isDismissed }),
  
  // Set logo hover state
  setIsHoveringLogo: (isHovering) => set({ isHoveringLogo: isHovering }),

  // Initialise navigation state from the current URL (called once on mount).
  // Returns true if a deep link was resolved (so the caller can skip the landing overlay).
  initFromUrl: () => {
    const navState = resolveUrlToState(window.location.pathname);
    if (navState) {
      set({ ...navState, _skipUrlPush: true, isLandingDismissed: true });
      // Replace (don't push) so we don't double the history entry
      replaceUrl(navState.currentView);
      // Reset the flag after the synchronous subscriber fires
      setTimeout(() => set({ _skipUrlPush: false }), 0);
      return true;
    }
    return false;
  },

  // Listen for browser back / forward and update store accordingly
  setupPopstateListener: () => {
    const handler = (event) => {
      const navState = resolveUrlToState(window.location.pathname);
      // Use _skipUrlPush so the subscriber doesn't push the URL back
      set({
        ...(navState || {
          currentView: 'home',
          currentMenu: 'main',
          activeMenuItem: null,
          expandedSubmenuId: null,
          expandedNestedSubmenuId: null,
          parentView: null
        }),
        _skipUrlPush: true
      });
      setTimeout(() => set({ _skipUrlPush: false }), 0);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  },
  
  // Navigation actions
  navigateToHome: () => set({
    currentView: 'home',
    currentMenu: 'main',
    activeMenuItem: null,
    expandedSubmenuId: null,
    expandedNestedSubmenuId: null,
    parentView: null
  }),
  
  // Toggle or navigate to a submenu
  navigateToSubmenu: (submenuParentId) => set((state) => {
    // If clicking the same submenu parent while on a subpage, go back to submenu landing
    if (state.expandedSubmenuId === submenuParentId && state.currentView !== submenuParentId) {
      return {
        currentView: submenuParentId,
        activeMenuItem: submenuParentId,
        currentMenu: submenuParentId,
        expandedSubmenuId: submenuParentId,
        expandedNestedSubmenuId: null,
        parentView: null
      };
    }
    // If clicking the same submenu parent while on its landing page, collapse it
    if (state.expandedSubmenuId === submenuParentId) {
      return {
        currentMenu: 'main',
        expandedSubmenuId: null,
        expandedNestedSubmenuId: null,
        activeMenuItem: null,
        currentView: null,
        parentView: null
      };
    }
    // Otherwise expand this submenu and show its landing page
    return {
      currentMenu: submenuParentId,
      expandedSubmenuId: submenuParentId,
      expandedNestedSubmenuId: null,
      activeMenuItem: submenuParentId,
      currentView: submenuParentId,
      parentView: null
    };
  }),

  // Navigate into a nested submenu (e.g. "More" inside Work)
  navigateToNestedSubmenu: (nestedId) => set((state) => {
    // If clicking the same nested submenu, collapse it back to parent submenu
    if (state.expandedNestedSubmenuId === nestedId) {
      return {
        currentView: state.expandedSubmenuId,
        activeMenuItem: state.expandedSubmenuId,
        expandedNestedSubmenuId: null,
        parentView: null
      };
    }
    // Expand nested submenu — show its grid content
    return {
      currentView: nestedId,
      activeMenuItem: nestedId,
      expandedNestedSubmenuId: nestedId,
      parentView: null
    };
  }),
  
  navigateToPage: (pageId, menuItemId) => set({
    currentView: pageId,
    activeMenuItem: menuItemId,
    expandedNestedSubmenuId: null,
    parentView: null
  }),
  
  // Navigate to a subpage within an already expanded submenu
  // parentView: optional intermediate page for nested grids (e.g. More inside Work)
  navigateToSubpage: (pageId, parentSubmenuId, parentView = null) => set({
    currentView: pageId,
    activeMenuItem: parentView || pageId,
    currentMenu: parentSubmenuId,
    expandedSubmenuId: parentSubmenuId,
    expandedNestedSubmenuId: parentView || null,
    parentView: parentView
  }),
  
  // Smart go back - goes up one level contextually
  goBack: () => set((state) => {
    // If we have a parentView (e.g. came from More grid), go back to More's grid
    if (state.parentView && state.currentView !== state.parentView) {
      return {
        currentView: state.parentView,
        activeMenuItem: state.parentView,
        currentMenu: state.expandedSubmenuId,
        expandedSubmenuId: state.expandedSubmenuId,
        expandedNestedSubmenuId: state.parentView,
        parentView: null
      };
    }
    // If a nested submenu is open, collapse it back to parent submenu
    if (state.expandedNestedSubmenuId) {
      return {
        currentView: state.expandedSubmenuId,
        activeMenuItem: state.expandedSubmenuId,
        currentMenu: state.expandedSubmenuId,
        expandedSubmenuId: state.expandedSubmenuId,
        expandedNestedSubmenuId: null,
        parentView: null
      };
    }
    // If viewing a subpage within a submenu, collapse the submenu and show its landing page
    if (state.expandedSubmenuId && state.currentView !== state.expandedSubmenuId) {
      return {
        currentView: state.expandedSubmenuId,
        activeMenuItem: state.expandedSubmenuId,
        currentMenu: 'main',
        expandedSubmenuId: null,
        expandedNestedSubmenuId: null,
        parentView: null
      };
    }
    // If viewing a submenu landing page (e.g., Work grid), go back to home
    if (state.expandedSubmenuId && state.currentView === state.expandedSubmenuId) {
      return {
        currentMenu: 'main',
        expandedSubmenuId: null,
        expandedNestedSubmenuId: null,
        activeMenuItem: null,
        currentView: 'home',
        parentView: null
      };
    }
    // If viewing a main menu page (not in a submenu), go back to home
    if (state.currentView && state.currentView !== 'home') {
      return {
        currentView: 'home',
        currentMenu: 'main',
        activeMenuItem: null,
        expandedSubmenuId: null,
        expandedNestedSubmenuId: null,
        parentView: null
      };
    }
    // Already at home, do nothing
    return {};
  }),
  
  // Check if back button should be visible
  canGoBack: () => {
    const state = get();
    return state.currentView !== 'home' || state.expandedSubmenuId !== null;
  },
  
  setHoveringMenuItem: (isHovering) => set({
    isHoveringMenuItem: isHovering
  }),
  
  setTheme: (themeName) => set((state) => {
    // If clicking the same theme, toggle inversion
    if (state.currentTheme === themeName) {
      return { isThemeInverted: !state.isThemeInverted };
    }
    // If clicking a different theme, set it and reset inversion
    return { currentTheme: themeName, isThemeInverted: false };
  })

}));

// ── URL sync: push URL whenever currentView changes ──
let prevView = useNavigationStore.getState().currentView;
useNavigationStore.subscribe((state) => {
  if (state.currentView !== prevView) {
    prevView = state.currentView;
    if (!state._skipUrlPush) {
      pushUrl(state.currentView);
    }
  }
});

// ── Resolve deep-link BEFORE first React render ──
// This must run at module level so isLandingDismissed is already true
// when LandingOverlay mounts.
useNavigationStore.getState().initFromUrl();
