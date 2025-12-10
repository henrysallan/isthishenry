import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  // Current view state - start on home page
  currentView: 'home', // 'home' or page id
  currentMenu: 'main', // 'main' or 'work'
  activeMenuItem: 'home',
  parentMenu: null,
  
  // Navigation actions
  navigateToHome: () => set({
    currentView: 'home',
    currentMenu: 'main',
    activeMenuItem: null,
    parentMenu: null
  }),
  
  navigateToMenu: (menuId) => set((state) => ({
    currentMenu: menuId,
    parentMenu: 'main',
    activeMenuItem: null,
    currentView: null
  })),
  
  navigateToPage: (pageId, menuId) => set({
    currentView: pageId,
    activeMenuItem: menuId
  }),
  
  goBack: () => set({
    currentMenu: 'main',
    parentMenu: null,
    activeMenuItem: null,
    currentView: null
  })
}));
