import { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { colorThemes } from '../config/theme';
import { theme } from '../config/theme';
import { useNavigationStore } from '../store/navigationStore';
import MenuSystem from './MenuSystem';
import ConnectionWires from './ConnectionWires';
import DrawableLine from './DrawableLine';
import { useControls } from 'leva';
import gsap from 'gsap';

// Leva store for camera controls
function CameraSetup({ cameraOffsetX, cameraOffsetY }) {
  const { camera, viewport } = useThree();
  const { expandedSubmenuId } = useNavigationStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Set up camera with manual offsets from Leva
    const mobileOffsetX = isMobile ? -5.0 : 0;
    const mobileOffsetY = isMobile ? -2.3 : 0;
    
    const baseX = cameraOffsetX + mobileOffsetX;
    const baseY = cameraOffsetY + mobileOffsetY;
    
    camera.position.set(baseX, baseY, 10);
    camera.lookAt(baseX, baseY, 0);
  }, [camera, isMobile, viewport.width, cameraOffsetX, cameraOffsetY]);

  // Animate camera when any submenu expands/collapses
  useEffect(() => {
    const mobileOffsetX = isMobile ? -2.8 : 0;
    const mobileOffsetY = isMobile ? -2 : 0;
    
    const baseX = cameraOffsetX + mobileOffsetX;
    const baseY = cameraOffsetY + mobileOffsetY;
    
    if (expandedSubmenuId) {
      // Pan camera right and back slightly to reveal submenu
      gsap.to(camera.position, {
        x: baseX + theme.spatial.cameraXMovement,
        z: 10 + theme.spatial.cameraZMovement,
        duration: theme.animation.duration,
        ease: 'power1.inOut'
      });
    } else {
      // Pan back to main menu view
      gsap.to(camera.position, {
        x: baseX,
        z: 10,
        duration: theme.animation.duration,
        ease: 'power1.inOut'
      });
    }
  }, [expandedSubmenuId, camera, isMobile, viewport.width, cameraOffsetX, cameraOffsetY]);

  return null;
}

function PortfolioScene() {
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const activeColors = colorThemes[currentTheme];
  
  // Leva controls for camera offset
  const { cameraOffsetX, cameraOffsetY } = useControls('Camera', {
    cameraOffsetX: { value: 0, min: -10, max: 10, step: 0.1 },
    cameraOffsetY: { value: 0, min: -10, max: 10, step: 0.1 }
  });
  
  // If inverted, background becomes text color
  const bgColor = isThemeInverted ? activeColors.text : activeColors.background;

  return (
    <>
      <CameraSetup cameraOffsetX={cameraOffsetX} cameraOffsetY={cameraOffsetY} />
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={1} />
      <MenuSystem />
      <ConnectionWires />
      <DrawableLine />
    </>
  );
}

export default PortfolioScene;
