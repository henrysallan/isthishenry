import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { colorThemes } from '../config/theme';
import { theme } from '../config/theme';
import { useNavigationStore } from '../store/navigationStore';
import MenuSystem from './MenuSystem';
import ConnectionWires from './ConnectionWires';
import DrawableLine from './DrawableLine';
import { useControls } from 'leva';
import gsap from 'gsap';
import * as THREE from 'three';

// Background dots component
function BackgroundDots({ color }) {
  const pointsRef = useRef();
  const { camera, pointer } = useThree();
  const gridSize = 80; // Number of dots per row/column
  const spacing = 2; // Space between dots
  const depth = -40; // Behind the menu content but in front of camera
  const hoverRadius = 8; // Radius of hover effect
  const hoverStrength = 2; // How far dots push away
  
  // Generate grid positions for dots (base positions)
  const { basePositions, positions } = useMemo(() => {
    const base = new Float32Array(gridSize * gridSize * 3);
    const pos = new Float32Array(gridSize * gridSize * 3);
    const offset = (gridSize - 1) * spacing / 2; // Center the grid
    
    let index = 0;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        base[index * 3] = i * spacing - offset;     // x
        base[index * 3 + 1] = j * spacing - offset; // y
        base[index * 3 + 2] = depth;                // z
        // Copy to current positions
        pos[index * 3] = base[index * 3];
        pos[index * 3 + 1] = base[index * 3 + 1];
        pos[index * 3 + 2] = base[index * 3 + 2];
        index++;
      }
    }
    return { basePositions: base, positions: pos };
  }, []);

  const count = gridSize * gridSize;

  // Update positions based on mouse
  useFrame(() => {
    if (!pointsRef.current) return;
    
    // Convert pointer to world coordinates at the dots' depth
    const mouseWorld = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera);
    const dir = mouseWorld.sub(camera.position).normalize();
    const distance = (depth - camera.position.z) / dir.z;
    const mousePos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    const positionAttr = pointsRef.current.geometry.attributes.position;
    
    for (let i = 0; i < count; i++) {
      const baseX = basePositions[i * 3];
      const baseY = basePositions[i * 3 + 1];
      const baseZ = basePositions[i * 3 + 2];
      
      // Calculate distance from mouse
      const dx = baseX - mousePos.x;
      const dy = baseY - mousePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let targetX = baseX;
      let targetY = baseY;
      
      if (dist < hoverRadius && dist > 0.01) {
        // Push away from cursor
        const force = (1 - dist / hoverRadius) * hoverStrength;
        const angle = Math.atan2(dy, dx);
        targetX = baseX + Math.cos(angle) * force;
        targetY = baseY + Math.sin(angle) * force;
      }
      
      // Lerp current position toward target
      const currentX = positionAttr.array[i * 3];
      const currentY = positionAttr.array[i * 3 + 1];
      const lerpFactor = 0.1;
      
      positionAttr.array[i * 3] = currentX + (targetX - currentX) * lerpFactor;
      positionAttr.array[i * 3 + 1] = currentY + (targetY - currentY) * lerpFactor;
    }
    
    positionAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={.8}
        sizeAttenuation={false}
        transparent={true}
        opacity={1}
      />
    </points>
  );
}

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
    if (isMobile) {
      // On mobile, center the submenu on screen when expanded
      const mobileBaseX = cameraOffsetX - 2.8;
      const mobileBaseY = cameraOffsetY - 2;
      
      if (expandedSubmenuId) {
        // Shift camera right to show both main menu and submenu
        // Reduced from 4.2 to show both menus on screen
        gsap.to(camera.position, {
          x: mobileBaseX + 2.5, // Shift right less to keep both menus visible
          y: mobileBaseY,
          z: 10,
          duration: theme.animation.duration,
          ease: 'power1.inOut'
        });
      } else {
        // Pan back to main menu view
        gsap.to(camera.position, {
          x: mobileBaseX,
          y: mobileBaseY,
          z: 10,
          duration: theme.animation.duration,
          ease: 'power1.inOut'
        });
      }
    } else {
      // Desktop behavior
      const baseX = cameraOffsetX;
      const baseY = cameraOffsetY;
      
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
    }
  }, [expandedSubmenuId, camera, isMobile, viewport.width, cameraOffsetX, cameraOffsetY]);

  return null;
}

function PortfolioScene() {
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const activeColors = colorThemes[currentTheme];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Leva controls for camera offset
  const { cameraOffsetX, cameraOffsetY } = useControls('Camera', {
    cameraOffsetX: { value: 0, min: -10, max: 10, step: 0.1 },
    cameraOffsetY: { value: 0, min: -10, max: 10, step: 0.1 }
  });
  
  // If inverted, background becomes text color
  const bgColor = isThemeInverted ? activeColors.text : activeColors.background;
  // Secondary color (text) for dots - inverts with theme
  const dotsColor = isThemeInverted ? activeColors.background : activeColors.text;

  return (
    <>
      <CameraSetup cameraOffsetX={cameraOffsetX} cameraOffsetY={cameraOffsetY} />
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={1} />
      {!isMobile && <BackgroundDots color={dotsColor} />}
      <MenuSystem />
      <ConnectionWires />
      <DrawableLine />
    </>
  );
}

export default PortfolioScene;
