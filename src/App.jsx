import { Canvas } from '@react-three/fiber';
import PortfolioScene from './components/PortfolioScene';
import ContentArea from './components/ContentArea';
import './App.css';

function App() {
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
    </div>
  );
}

export default App;
