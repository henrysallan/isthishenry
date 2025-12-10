import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import PortfolioScene from './components/PortfolioScene';
import ContentArea from './components/ContentArea';
import CustomCursor from './components/CustomCursor';
import LandingOverlay from './components/LandingOverlay';
import HomeTextOverlay from './components/HomeTextOverlay';
import './App.css';

function App() {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="App">
      <Canvas
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
      {showOverlay && (
        <LandingOverlay onComplete={() => setShowOverlay(false)} />
      )}
    </div>
  );
}

export default App;
