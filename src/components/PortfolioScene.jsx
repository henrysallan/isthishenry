import { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { theme } from '../config/theme';
import { useNavigationStore } from '../store/navigationStore';
import MenuSystem from './MenuSystem';
import ConnectionWires from './ConnectionWires';
import gsap from 'gsap';

function CameraSetup() {
  const { camera } = useThree();
  const { currentMenu } = useNavigationStore();
  
  useEffect(() => {
    // Set up orthographic-like fixed camera
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Animate camera when menu changes
  useEffect(() => {
    if (currentMenu === 'work') {
      // Pan camera right and back slightly to reveal submenu
      gsap.to(camera.position, {
        x: theme.spatial.cameraXMovement,
        z: 10 + theme.spatial.cameraZMovement,
        duration: theme.animation.duration,
        ease: 'power1.inOut' // Smoother, less aggressive easing
      });
    } else {
      // Pan back to main menu view
      gsap.to(camera.position, {
        x: 0,
        z: 10,
        duration: theme.animation.duration,
        ease: 'power1.inOut' // Smoother, less aggressive easing
      });
    }
  }, [currentMenu, camera]);

  return null;
}

function PortfolioScene() {
  return (
    <>
      <CameraSetup />
      <color attach="background" args={['#f3f3f3']} />
      <ambientLight intensity={1} />
      <MenuSystem />
      <ConnectionWires />
    </>
  );
}

export default PortfolioScene;
