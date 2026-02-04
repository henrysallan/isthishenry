import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import PortfolioScene from './components/PortfolioScene';
import ContentArea from './components/ContentArea';
import CustomCursor from './components/CustomCursor';
import LandingOverlay from './components/LandingOverlay';
import ReturnArrow from './components/ReturnArrow';
import HomeTextOverlay from './components/HomeTextOverlay';
import ColorPicker from './components/ColorPicker';
// import WebcamSphere from './components/WebcamSphere';
import { useNavigationStore } from './store/navigationStore';
import { colorThemes } from './config/theme';
import { preloadAllAssets } from './utils/preloader';
import './App.css';

function App() {
  const [showLeva, setShowLeva] = useState(false);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);

  // Start preloading assets immediately on mount
  useEffect(() => {
    // Small delay to let the initial render complete
    const timer = setTimeout(() => {
      preloadAllAssets((progress) => {
        // Optional: could update a loading indicator here
        console.log(`[Preloader] ${Math.round(progress * 100)}% loaded`);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Toggle Leva with 'o' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'o' || e.key === 'O') {
        setShowLeva(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      <Leva hidden={!showLeva} />
      <Canvas
        flat
        linear
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <PortfolioScene />
      </Canvas>
      <ContentArea />
      <HomeTextOverlay />
      <CustomCursor />
      <ColorPicker />
      {/* <WebcamSphere /> */}
      <LandingOverlay />
      <ReturnArrow />
    </div>
  );
}

export default App;
