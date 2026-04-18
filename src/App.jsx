import { useState, useEffect, useCallback } from 'react';
import P5Menu from './components/P5Menu_canvas';
import ContentArea from './components/ContentArea';
import CustomCursor from './components/CustomCursor';
import LandingOverlay from './components/LandingOverlay';
import ReturnArrow from './components/ReturnArrow';
import HomeTextOverlay from './components/HomeTextOverlay';
import ColorPicker from './components/ColorPicker';
import LoadingScreen from './components/LoadingScreen';
// import WebcamSphere from './components/WebcamSphere';
import { useNavigationStore } from './store/navigationStore';
import { colorThemes } from './config/theme';
import { preloadAllAssets } from './utils/preloader';
import './App.css';

function App() {
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Listen for browser back/forward to sync URL with navigation state
  useEffect(() => {
    const cleanup = useNavigationStore.getState().setupPopstateListener();
    return cleanup;
  }, []);

  // Start preloading assets immediately on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadAllAssets((progress) => {
        console.log(`[Preloader] ${Math.round(progress * 100)}% loaded`);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Update CSS variables when theme changes
  useEffect(() => {
    const activeColors = colorThemes[currentTheme];
    const root = document.documentElement;
    
    // If inverted, swap background with text/wire colors
    if (isThemeInverted) {
      // Background becomes the text/wire color
      root.style.setProperty('--color-background', activeColors.text);
      root.style.setProperty('--color-content-area', activeColors.text);
      // All other elements become the background color
      root.style.setProperty('--color-border', activeColors.background);
      root.style.setProperty('--color-text', activeColors.background);
      root.style.setProperty('--color-text-light', activeColors.background);
      root.style.setProperty('--color-wire', activeColors.background);
    } else {
      // Normal theme
      root.style.setProperty('--color-background', activeColors.background);
      root.style.setProperty('--color-content-area', activeColors.contentArea);
      root.style.setProperty('--color-border', activeColors.border);
      root.style.setProperty('--color-text', activeColors.text);
      root.style.setProperty('--color-text-light', activeColors.textLight);
      root.style.setProperty('--color-wire', activeColors.wire);
    }
    
    root.style.setProperty('--color-accent', activeColors.accent);
  }, [currentTheme, isThemeInverted]);

  return (
    <div className="App">
      <P5Menu />
      <ContentArea />
      <HomeTextOverlay />
      <CustomCursor />
      {/* <ColorPicker /> */}
      {/* <WebcamSphere /> */}
      <LandingOverlay />
      <ReturnArrow />
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
    </div>
  );
}

export default App;
