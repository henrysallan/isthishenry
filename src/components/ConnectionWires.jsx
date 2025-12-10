import { useRef, useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { theme, getMenuPosition, getSocketPositions, getMenuInSocket, create3DBezierCurve } from '../config/theme';
import * as THREE from 'three';
import gsap from 'gsap';

function AnimatedLine({ points, color, lineWidth, delay = 0, visible = true }) {
  const lineRef = useRef();
  const [visiblePoints, setVisiblePoints] = useState([points[0], points[0]]);
  const animationRef = useRef(null);

  useEffect(() => {
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill();
    }

    if (visible) {
      // Reset to just first point
      setVisiblePoints([points[0], points[0]]);
      
      // Animate the line drawing in
      const obj = { progress: 0 };
      animationRef.current = gsap.to(obj, {
        progress: 1,
        duration: 1.5,
        ease: 'power2.out',
        delay: delay,
        onUpdate: () => {
          const totalPoints = points.length;
          const exactIndex = obj.progress * (totalPoints - 1);
          const baseIndex = Math.floor(exactIndex);
          const fraction = exactIndex - baseIndex;
          
          // Get all points up to base index
          const newPoints = points.slice(0, baseIndex + 1);
          
          // Interpolate to the partial point for smooth animation
          if (baseIndex < totalPoints - 1 && fraction > 0) {
            const p1 = points[baseIndex];
            const p2 = points[baseIndex + 1];
            const interpolated = new THREE.Vector3(
              p1.x + (p2.x - p1.x) * fraction,
              p1.y + (p2.y - p1.y) * fraction,
              p1.z + (p2.z - p1.z) * fraction
            );
            newPoints.push(interpolated);
          }
          
          setVisiblePoints(newPoints);
        }
      });
    } else {
      // Animate out - reverse the drawing
      const obj = { progress: 1 };
      animationRef.current = gsap.to(obj, {
        progress: 0,
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: () => {
          const totalPoints = points.length;
          const exactIndex = obj.progress * (totalPoints - 1);
          const baseIndex = Math.floor(exactIndex);
          const fraction = exactIndex - baseIndex;
          
          if (baseIndex === 0 && fraction === 0) {
            setVisiblePoints([points[0], points[0]]);
            return;
          }
          
          // Get all points up to base index
          const newPoints = points.slice(0, baseIndex + 1);
          
          // Interpolate to the partial point for smooth animation
          if (baseIndex < totalPoints - 1 && fraction > 0) {
            const p1 = points[baseIndex];
            const p2 = points[baseIndex + 1];
            const interpolated = new THREE.Vector3(
              p1.x + (p2.x - p1.x) * fraction,
              p1.y + (p2.y - p1.y) * fraction,
              p1.z + (p2.z - p1.z) * fraction
            );
            newPoints.push(interpolated);
          }
          
          setVisiblePoints(newPoints);
        }
      });
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [points, delay, visible]);

  return (
    <Line
      ref={lineRef}
      points={visiblePoints}
      color={color}
      lineWidth={lineWidth}
    />
  );
}

function ConnectionWires() {
  const { viewport } = useThree();
  const { currentMenu, currentView, activeMenuItem } = useNavigationStore();
  const [showWorkWire, setShowWorkWire] = useState(false);
  const [displayedPageWireItem, setDisplayedPageWireItem] = useState(null);
  const [isPageWireVisible, setIsPageWireVisible] = useState(true);
  const previousMenuRef = useRef(currentMenu);
  const previousViewRef = useRef(currentView);
  const previousActiveItemRef = useRef(activeMenuItem);

  // Calculate shared positioning values
  const leftColumnWidth = viewport.width * theme.layout.leftColumnRatio;
  const leftColumnCenter = -viewport.width / 2 + leftColumnWidth / 2;

  // Calculate all menu item positions
  const mainMenuPositions = useMemo(() => {
    const menuCount = navigationData.mainMenu.length;
    return navigationData.mainMenu.map((item, index) => 
      getMenuPosition('main', leftColumnCenter, index, menuCount)
    );
  }, [leftColumnCenter]);

  const workSubmenuPositions = useMemo(() => {
    const workSubmenu = navigationData.mainMenu.find(item => item.id === 'work')?.submenu || [];
    return workSubmenu.map((item, index) => 
      getMenuPosition('submenu', leftColumnCenter, index, workSubmenu.length)
    );
  }, [leftColumnCenter]);

  // Home to main menu wire - always visible
  const homeToMainWire = useMemo(() => {
    const homePos = [leftColumnCenter - 3.0, 0, 0];
    const homeSockets = getSocketPositions(homePos, 'Home', 0.15);
    const mainMenuInSocket = getMenuInSocket(mainMenuPositions);
    
    if (mainMenuInSocket) {
      const curvePoints = create3DBezierCurve(homeSockets.out, mainMenuInSocket);
      return curvePoints.map(p => new THREE.Vector3(...p));
    }
    return null;
  }, [leftColumnCenter, mainMenuPositions]);

  // Track when to show/hide work wire
  useEffect(() => {
    if (currentMenu === 'work' && previousMenuRef.current !== 'work') {
      setShowWorkWire(true);
    } else if (currentMenu !== 'work' && previousMenuRef.current === 'work') {
      // Keep showing but mark as not visible for animation
      setTimeout(() => setShowWorkWire(false), 1500); // Wait for animation to complete
    }
    previousMenuRef.current = currentMenu;
  }, [currentMenu]);

  // Track when to show/hide page wire
  useEffect(() => {
    const shouldShow = currentView && currentView !== 'home' && activeMenuItem;
    
    if (shouldShow && !previousViewRef.current) {
      // First time showing a page
      setDisplayedPageWireItem(activeMenuItem);
      setIsPageWireVisible(true);
    } else if (!shouldShow && previousViewRef.current) {
      // Navigating away from page to home or menu
      setIsPageWireVisible(false);
      setTimeout(() => setDisplayedPageWireItem(null), 1500); // Wait for animation to complete
    } else if (shouldShow && activeMenuItem !== previousActiveItemRef.current && previousActiveItemRef.current) {
      // Switching between pages - animate out old, then animate in new
      setIsPageWireVisible(false);
      setTimeout(() => {
        setDisplayedPageWireItem(activeMenuItem);
        setIsPageWireVisible(true);
      }, 1500); // Wait for old wire to animate out
    }
    
    previousViewRef.current = currentView;
    previousActiveItemRef.current = activeMenuItem;
  }, [currentView, activeMenuItem]);

  // Parent Work to submenu wire
  const workToSubmenuWire = useMemo(() => {
    // Generate wire points even if not currently visible (for animate out)
    if (currentMenu === 'work' || showWorkWire) {
      // Find Work menu item position from main menu (index 0)
      const workMenuItemPos = mainMenuPositions[0]; // Work is the first item
      const workSockets = getSocketPositions(workMenuItemPos, 'Work', 0.15);
      const submenuInSocket = getMenuInSocket(workSubmenuPositions);
      
      if (submenuInSocket) {
        const curvePoints = create3DBezierCurve(workSockets.out, submenuInSocket);
        return curvePoints.map(p => new THREE.Vector3(...p));
      }
    }
    return null;
  }, [currentMenu, showWorkWire, mainMenuPositions, workSubmenuPositions]);

  // Menu item to page content wire
  const menuToPageWire = useMemo(() => {
    if (!displayedPageWireItem) return null;
    
    const itemToUse = displayedPageWireItem;
    
    // Find the active menu item position and text
    let menuItemPos = null;
    let menuItemText = '';
    let menuItemIndex = -1;
    
    // Check if it's in main menu
    menuItemIndex = navigationData.mainMenu.findIndex(item => item.id === itemToUse);
    if (menuItemIndex !== -1) {
      menuItemPos = mainMenuPositions[menuItemIndex];
      menuItemText = navigationData.mainMenu[menuItemIndex].title;
    } else {
      // Check if it's in work submenu
      const workSubmenu = navigationData.mainMenu.find(item => item.id === 'work')?.submenu || [];
      menuItemIndex = workSubmenu.findIndex(item => item.id === itemToUse);
      if (menuItemIndex !== -1) {
        menuItemPos = workSubmenuPositions[menuItemIndex];
        menuItemText = workSubmenu[menuItemIndex].title;
      }
    }
    
    if (menuItemPos) {
      const menuSockets = getSocketPositions(menuItemPos, menuItemText, 0.15);
      
      // Content area left edge calculation
      // When in submenu, camera has moved right, so content area appears further right
      const leftColumnWidth = viewport.width * theme.layout.leftColumnRatio;
      const contentLeftEdge = -viewport.width / 2 + leftColumnWidth;
      
      // Add camera offset when in submenu view
      const cameraOffset = currentMenu === 'work' ? theme.spatial.cameraXMovement : 0;
      
      // Content area IN socket
      const contentInSocket = [
        contentLeftEdge + cameraOffset + theme.spatial.socketOffset.margin, // Standard margin from content edge
        menuItemPos[1] + 2.0, // Y position - offset up by 0.1 units
        menuItemPos[2] // Same Z depth as the menu item
      ];
      
      const curvePoints = create3DBezierCurve(menuSockets.out, contentInSocket);
      return curvePoints.map(p => new THREE.Vector3(...p));
    }
    
    return null;
  }, [displayedPageWireItem, mainMenuPositions, workSubmenuPositions, viewport, currentMenu]);

  return (
    <group>
      {/* Home to main menu connection */}
      {homeToMainWire && (
        <Line
          points={homeToMainWire}
          color={theme.colors.wire}
          lineWidth={1}
        />
      )}

      {/* Work to submenu connection - animated with trim paths */}
      {workToSubmenuWire && (
        <AnimatedLine
          points={workToSubmenuWire}
          color={theme.colors.wire}
          lineWidth={1}
          delay={currentMenu === 'work' ? 0.5 : 0}
          visible={currentMenu === 'work'}
        />
      )}

      {/* Menu item to page content connection - animated */}
      {menuToPageWire && (
        <AnimatedLine
          points={menuToPageWire}
          color={theme.colors.wire}
          lineWidth={1}
          delay={isPageWireVisible ? 0.3 : 0}
          visible={isPageWireVisible}
        />
      )}
    </group>
  );
}

export default ConnectionWires;
