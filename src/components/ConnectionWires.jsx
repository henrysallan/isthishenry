import { useRef, useEffect, useMemo, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { colorThemes, theme, getMenuPosition, getSocketPositions, getMenuInSocket, create3DBezierCurve, create3DBezierCurveVertical } from '../config/theme';
import * as THREE from 'three';
import gsap from 'gsap';

// Helper to get point and tangent at a specific t value along a bezier curve (array of points)
function getPointAndTangentAtT(points, t) {
  const totalPoints = points.length;
  const exactIndex = t * (totalPoints - 1);
  const baseIndex = Math.floor(exactIndex);
  const fraction = exactIndex - baseIndex;
  
  // Get the point at t
  let point;
  if (baseIndex >= totalPoints - 1) {
    point = points[totalPoints - 1].clone();
  } else {
    const p1 = points[baseIndex];
    const p2 = points[baseIndex + 1];
    point = new THREE.Vector3(
      p1.x + (p2.x - p1.x) * fraction,
      p1.y + (p2.y - p1.y) * fraction,
      p1.z + (p2.z - p1.z) * fraction
    );
  }
  
  // Get tangent (direction) at t
  let tangent;
  if (baseIndex >= totalPoints - 1) {
    const p1 = points[totalPoints - 2];
    const p2 = points[totalPoints - 1];
    tangent = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
  } else {
    const p1 = points[baseIndex];
    const p2 = points[baseIndex + 1];
    tangent = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
  }
  
  return { point, tangent };
}

// Arrow chevron component that points along the line toward origin
function ArrowChevron({ position, tangent, color, opacity, scale = 0.06 }) {
  // Tangent points toward destination, so we flip it to point toward origin
  const angle = Math.atan2(-tangent.y, -tangent.x);
  
  // Create chevron points (< shape)
  const armLength = scale;
  const armAngle = Math.PI / 6; // 30 degrees
  
  const tip = new THREE.Vector3(0, 0, 0);
  const topArm = new THREE.Vector3(
    Math.cos(armAngle) * armLength,
    Math.sin(armAngle) * armLength,
    0
  );
  const bottomArm = new THREE.Vector3(
    Math.cos(-armAngle) * armLength,
    Math.sin(-armAngle) * armLength,
    0
  );
  
  return (
    <group position={position} rotation={[0, 0, angle]}>
      <Line
        points={[topArm, tip, bottomArm]}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={opacity}
      />
    </group>
  );
}

// Clickable wire with arrows pointing toward origin
function ClickableWire({ points, onClick, baseLineWidth = 0.5, hoverLineWidth = 1.5 }) {
  const [hovered, setHovered] = useState(false);
  const lineWidthRef = useRef(baseLineWidth);
  const [currentLineWidth, setCurrentLineWidth] = useState(baseLineWidth);
  const setHoveringMenuItem = useNavigationStore(state => state.setHoveringMenuItem);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  const activeColors = colorThemes[currentTheme];
  const color = isThemeInverted ? activeColors.background : activeColors.wire;
  
  // Lerp line width on hover
  useFrame(() => {
    const targetWidth = hovered ? hoverLineWidth : baseLineWidth;
    lineWidthRef.current += (targetWidth - lineWidthRef.current) * 0.15;
    
    // Only update state if there's a meaningful change (avoid unnecessary re-renders)
    if (Math.abs(lineWidthRef.current - currentLineWidth) > 0.01) {
      setCurrentLineWidth(lineWidthRef.current);
    }
  });
  
  // Calculate arrow positions at 1/3 and 2/3 of the line
  const { arrow1, arrow2 } = useMemo(() => {
    if (!points || points.length < 2) return { arrow1: null, arrow2: null };
    
    const data1 = getPointAndTangentAtT(points, 1/3);
    const data2 = getPointAndTangentAtT(points, 2/3);
    
    return {
      arrow1: { position: data1.point, tangent: data1.tangent },
      arrow2: { position: data2.point, tangent: data2.tangent }
    };
  }, [points]);
  
  // Create a wider invisible hit area for easier clicking
  const hitAreaPoints = useMemo(() => {
    return points;
  }, [points]);
  
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    setHoveringMenuItem(hovered);
  }, [hovered, setHoveringMenuItem]);
  
  const opacity = hovered ? 1 : 0.6;
  
  return (
    <group>
      {/* Invisible hit area - wider line for easier clicking */}
      <Line
        points={hitAreaPoints}
        color={color}
        lineWidth={15}
        transparent
        opacity={0}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
      
      {/* Visible line */}
      <Line
        points={points}
        color={color}
        lineWidth={currentLineWidth}
        transparent
        opacity={opacity}
      />
      
      {/* Arrow at 1/3 position */}
      {arrow1 && (
        <ArrowChevron
          position={arrow1.position}
          tangent={arrow1.tangent}
          color={color}
          opacity={opacity}
        />
      )}
      
      {/* Arrow at 2/3 position */}
      {arrow2 && (
        <ArrowChevron
          position={arrow2.position}
          tangent={arrow2.tangent}
          color={color}
          opacity={opacity}
        />
      )}
    </group>
  );
}

// Animated clickable wire with arrows
function AnimatedClickableWire({ points, lineWidth, delay = 0, visible = true, onClick, baseLineWidth = 0.5, hoverLineWidth = 1.5 }) {
  const [visiblePoints, setVisiblePoints] = useState([points[0], points[0]]);
  const [showArrows, setShowArrows] = useState(false);
  const [hovered, setHovered] = useState(false);
  const lineWidthRef = useRef(baseLineWidth);
  const [currentLineWidth, setCurrentLineWidth] = useState(baseLineWidth);
  const animationRef = useRef(null);
  const setHoveringMenuItem = useNavigationStore(state => state.setHoveringMenuItem);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  const activeColors = colorThemes[currentTheme];
  const color = isThemeInverted ? activeColors.background : activeColors.wire;

  // Lerp line width on hover
  useFrame(() => {
    const targetWidth = hovered ? hoverLineWidth : baseLineWidth;
    lineWidthRef.current += (targetWidth - lineWidthRef.current) * 0.15;
    
    if (Math.abs(lineWidthRef.current - currentLineWidth) > 0.01) {
      setCurrentLineWidth(lineWidthRef.current);
    }
  });

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.kill();
    }

    if (visible) {
      setVisiblePoints([points[0], points[0]]);
      setShowArrows(false);
      
      const obj = { progress: 0 };
      animationRef.current = gsap.to(obj, {
        progress: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: delay,
        onUpdate: () => {
          const totalPoints = points.length;
          const exactIndex = obj.progress * (totalPoints - 1);
          const baseIndex = Math.floor(exactIndex);
          const fraction = exactIndex - baseIndex;
          
          const newPoints = points.slice(0, baseIndex + 1);
          
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
          
          // Show arrows after line is mostly drawn
          if (obj.progress > 0.7 && !showArrows) {
            setShowArrows(true);
          }
        },
        onComplete: () => {
          setShowArrows(true);
        }
      });
    } else {
      setShowArrows(false);
      const obj = { progress: 1 };
      animationRef.current = gsap.to(obj, {
        progress: 0,
        duration: 0.8,
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
          
          const newPoints = points.slice(0, baseIndex + 1);
          
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

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    setHoveringMenuItem(hovered);
  }, [hovered, setHoveringMenuItem]);

  // Calculate arrow positions based on full path
  const { arrow1, arrow2 } = useMemo(() => {
    if (!points || points.length < 2) return { arrow1: null, arrow2: null };
    
    const data1 = getPointAndTangentAtT(points, 1/3);
    const data2 = getPointAndTangentAtT(points, 2/3);
    
    return {
      arrow1: { position: data1.point, tangent: data1.tangent },
      arrow2: { position: data2.point, tangent: data2.tangent }
    };
  }, [points]);

  const opacity = hovered ? 1 : 0.6;

  return (
    <group>
      {/* Invisible hit area */}
      <Line
        points={points}
        color={color}
        lineWidth={15}
        transparent
        opacity={0}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (visible && onClick) onClick();
        }}
      />
      
      {/* Visible animated line */}
      <Line
        points={visiblePoints}
        color={color}
        lineWidth={currentLineWidth}
        transparent
        opacity={opacity}
      />
      
      {/* Arrows - only show when line is drawn and visible */}
      {showArrows && visible && arrow1 && (
        <ArrowChevron
          position={arrow1.position}
          tangent={arrow1.tangent}
          color={color}
          opacity={opacity}
        />
      )}
      {showArrows && visible && arrow2 && (
        <ArrowChevron
          position={arrow2.position}
          tangent={arrow2.tangent}
          color={color}
          opacity={opacity}
        />
      )}
    </group>
  );
}

function AnimatedLine({ points, lineWidth, delay = 0, visible = true }) {
  const lineRef = useRef();
  const [visiblePoints, setVisiblePoints] = useState([points[0], points[0]]);
  const animationRef = useRef(null);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  // Get color based on inversion state
  const activeColors = colorThemes[currentTheme];
  const color = isThemeInverted ? activeColors.background : activeColors.wire;

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
        duration: 0.8,
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
        duration: 0.8,
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
  const { currentMenu, currentView, activeMenuItem, expandedSubmenuId, currentTheme, navigateToHome, navigateToSubmenu } = useNavigationStore();
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  const activeColors = colorThemes[currentTheme];
  const wireColor = isThemeInverted ? activeColors.background : activeColors.wire;
  
  const [showSubmenuWire, setShowSubmenuWire] = useState(false);
  const [displayedSubmenuId, setDisplayedSubmenuId] = useState(null);
  const [displayedPageWireItem, setDisplayedPageWireItem] = useState(null);
  const [isPageWireVisible, setIsPageWireVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const previousSubmenuRef = useRef(expandedSubmenuId);
  const previousViewRef = useRef(currentView);
  const previousActiveItemRef = useRef(activeMenuItem);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate shared positioning values
  const leftColumnWidth = viewport.width * theme.layout.leftColumnRatio;
  const leftColumnCenter = -viewport.width / 2 + leftColumnWidth / 2;

  // Calculate all menu item positions
  const mainMenuPositions = useMemo(() => {
    const menuCount = navigationData.mainMenu.length;
    return navigationData.mainMenu.map((item, index) => 
      getMenuPosition('main', leftColumnCenter, index, menuCount, isMobile)
    );
  }, [leftColumnCenter, isMobile]);

  // Dynamic submenu positions based on expanded parent
  const submenuPositions = useMemo(() => {
    const parentId = displayedSubmenuId || expandedSubmenuId;
    if (!parentId) return [];
    
    const parent = navigationData.mainMenu.find(item => item.id === parentId);
    if (!parent?.submenu) return [];
    
    return parent.submenu.map((item, index) => 
      getMenuPosition('submenu', leftColumnCenter, index, parent.submenu.length, isMobile)
    );
  }, [leftColumnCenter, isMobile, displayedSubmenuId, expandedSubmenuId]);

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

  // Track when to show/hide submenu wire (dynamic for any submenu)
  useEffect(() => {
    if (expandedSubmenuId && previousSubmenuRef.current !== expandedSubmenuId) {
      // New submenu opened
      setDisplayedSubmenuId(expandedSubmenuId);
      setShowSubmenuWire(true);
    } else if (!expandedSubmenuId && previousSubmenuRef.current) {
      // Submenu closed - keep showing for animation out
      setTimeout(() => {
        setShowSubmenuWire(false);
        setDisplayedSubmenuId(null);
      }, 800);
    }
    previousSubmenuRef.current = expandedSubmenuId;
  }, [expandedSubmenuId]);

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
      setTimeout(() => setDisplayedPageWireItem(null), 800);
    } else if (shouldShow && activeMenuItem !== previousActiveItemRef.current && previousActiveItemRef.current) {
      // Switching between pages
      setIsPageWireVisible(false);
      setTimeout(() => {
        setDisplayedPageWireItem(activeMenuItem);
        setIsPageWireVisible(true);
      }, 800);
    }
    
    previousViewRef.current = currentView;
    previousActiveItemRef.current = activeMenuItem;
  }, [currentView, activeMenuItem]);

  // Dynamic parent to submenu wire
  const parentToSubmenuWire = useMemo(() => {
    const parentId = displayedSubmenuId || expandedSubmenuId;
    if (!parentId || (!showSubmenuWire && !expandedSubmenuId)) return null;
    
    // Find the parent menu item index and its position
    const parentIndex = navigationData.mainMenu.findIndex(item => item.id === parentId);
    if (parentIndex === -1) return null;
    
    const parentItem = navigationData.mainMenu[parentIndex];
    const parentPos = mainMenuPositions[parentIndex];
    const parentSockets = getSocketPositions(parentPos, parentItem.title, 0.15);
    const submenuInSocket = getMenuInSocket(submenuPositions);
    
    if (submenuInSocket) {
      const curvePoints = create3DBezierCurve(parentSockets.out, submenuInSocket);
      return curvePoints.map(p => new THREE.Vector3(...p));
    }
    return null;
  }, [displayedSubmenuId, expandedSubmenuId, showSubmenuWire, mainMenuPositions, submenuPositions]);

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
      // Check all submenus dynamically
      for (const mainItem of navigationData.mainMenu) {
        if (mainItem.submenu) {
          const subIndex = mainItem.submenu.findIndex(item => item.id === itemToUse);
          if (subIndex !== -1) {
            // Calculate position for this submenu item
            menuItemPos = getMenuPosition('submenu', leftColumnCenter, subIndex, mainItem.submenu.length, isMobile);
            menuItemText = mainItem.submenu[subIndex].title;
            break;
          }
        }
      }
    }
    
    if (menuItemPos) {
      const menuSockets = getSocketPositions(menuItemPos, menuItemText, 0.15);
      
      // Content area left edge calculation
      const leftColumnWidth = viewport.width * theme.layout.leftColumnRatio;
      const contentLeftEdge = -viewport.width / 2 + leftColumnWidth;
      
      // Add camera offset when in submenu view
      const cameraOffset = expandedSubmenuId ? theme.spatial.cameraXMovement : 0;
      
      // Content area IN socket
      let contentInSocket;
      if (isMobile) {
        // On mobile, content is below the menu, so wire goes down
        contentInSocket = [
          menuItemPos[0] + 0.5, // Slightly to the right of menu item
          -viewport.height / 2 + 1, // Bottom of viewport (where content area starts)
          menuItemPos[2]
        ];
      } else {
        contentInSocket = [
          contentLeftEdge + cameraOffset + theme.spatial.socketOffset.margin,
          menuItemPos[1] + 2.0,
          menuItemPos[2]
        ];
      }
      
      // Use different curve generation for mobile (vertical) vs desktop (horizontal)
      let curvePoints;
      if (isMobile) {
        curvePoints = create3DBezierCurveVertical(menuSockets.out, contentInSocket);
      } else {
        curvePoints = create3DBezierCurve(menuSockets.out, contentInSocket);
      }
      return curvePoints.map(p => new THREE.Vector3(...p));
    }
    
    return null;
  }, [displayedPageWireItem, mainMenuPositions, viewport, expandedSubmenuId, isMobile, leftColumnCenter]);

  return (
    <group>
      {/* Home to main menu connection - clickable to go to Home */}
      {homeToMainWire && (
        <ClickableWire
          points={homeToMainWire}
          onClick={() => navigateToHome()}
          baseLineWidth={0.5}
          hoverLineWidth={1.5}
        />
      )}

      {/* Dynamic parent to submenu connection - clickable to collapse submenu */}
      {parentToSubmenuWire && (
        <AnimatedClickableWire
          points={parentToSubmenuWire}
          lineWidth={0.5}
          delay={expandedSubmenuId ? 0.5 : 0}
          visible={!!expandedSubmenuId}
          onClick={() => navigateToSubmenu(expandedSubmenuId)}
          baseLineWidth={0.5}
          hoverLineWidth={1.5}
        />
      )}

      {/* Menu item to page content connection - not clickable, desktop only */}
      {menuToPageWire && !isMobile && (
        <AnimatedLine
          points={menuToPageWire}
          lineWidth={0.5}
          delay={isPageWireVisible ? 0.3 : 0}
          visible={isPageWireVisible}
        />
      )}
    </group>
  );
}

export default ConnectionWires;
