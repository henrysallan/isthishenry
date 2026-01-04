import { create } from 'zustand';

// Detect system dark mode preference
const getSystemDarkModePreference = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false; // Default to light mode if can't detect
};

export const useNavigationStore = create((set, get) => ({
  // Current view state - start on home page
  currentView: 'home', // 'home' or page id
  currentMenu: 'main', // 'main' or the id of expanded submenu parent
  activeMenuItem: 'home',
  expandedSubmenuId: null, // ID of the menu item whose submenu is currently expanded
  isHoveringMenuItem: false, // Track if hovering over any menu item
  isHoveringLogo: false, // Track if hovering over logo letters
  currentTheme: 'classic', // Active color theme
  isThemeInverted: getSystemDarkModePreference(), // Initialize based on system preference
  
  // Set logo hover state
  setIsHoveringLogo: (isHovering) => set({ isHoveringLogo: isHovering }),
  
  // Navigation actions
  navigateToHome: () => set({
    currentView: 'home',
    currentMenu: 'main',
    activeMenuItem: null,
    expandedSubmenuId: null
  }),
  
  // Toggle or navigate to a submenu
  navigateToSubmenu: (submenuParentId) => set((state) => {
    // If clicking the same submenu parent while on a subpage, go back to submenu landing
    if (state.expandedSubmenuId === submenuParentId && state.currentView !== submenuParentId) {
      return {
        currentView: submenuParentId,
        activeMenuItem: submenuParentId,
        currentMenu: submenuParentId,
        expandedSubmenuId: submenuParentId
      };
    }
    // If clicking the same submenu parent while on its landing page, collapse it
    if (state.expandedSubmenuId === submenuParentId) {
      return {
        currentMenu: 'main',
        expandedSubmenuId: null,
        activeMenuItem: null,
        currentView: null
      };
    }
    // Otherwise expand this submenu and show its landing page
    return {
      currentMenu: submenuParentId,
      expandedSubmenuId: submenuParentId,
      activeMenuItem: submenuParentId,
      currentView: submenuParentId // Show the submenu's landing page
    };
  }),
  
  navigateToPage: (pageId, menuItemId) => set({
    currentView: pageId,
    activeMenuItem: menuItemId
  }),
  
  // Navigate to a subpage within an already expanded submenu
  navigateToSubpage: (pageId, parentSubmenuId) => set({
    currentView: pageId,
    activeMenuItem: pageId,
    currentMenu: parentSubmenuId,
    expandedSubmenuId: parentSubmenuId
  }),
  
  // Smart go back - goes up one level contextually
  goBack: () => set((state) => {
    // If viewing a subpage within a submenu, go back to the submenu landing page
    if (state.expandedSubmenuId && state.currentView !== state.expandedSubmenuId) {
      return {
        currentView: state.expandedSubmenuId,
        activeMenuItem: state.expandedSubmenuId,
        currentMenu: state.expandedSubmenuId,
        expandedSubmenuId: state.expandedSubmenuId
      };
    }
    // If viewing a submenu landing page (e.g., Work grid), go back to home
    if (state.expandedSubmenuId && state.currentView === state.expandedSubmenuId) {
      return {
        currentMenu: 'main',
        expandedSubmenuId: null,
        activeMenuItem: null,
        currentView: 'home'
      };
    }
    // If viewing a main menu page (not in a submenu), go back to home
    if (state.currentView && state.currentView !== 'home') {
      return {
        currentView: 'home',
        currentMenu: 'main',
        activeMenuItem: null,
        expandedSubmenuId: null
      };
    }
    // Already at home, do nothing
    return {};
  }),
  
  // Check if back button should be visible
  canGoBack: () => {
    const state = get();
    return state.currentView !== 'home';
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
