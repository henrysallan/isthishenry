import { useRef, useEffect, useMemo, useState } from 'react';
import { useThree, useLoader } from '@react-three/fiber';
import { Text, Svg } from '@react-three/drei';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes, theme, getMenuPosition } from '../config/theme';
import gsap from 'gsap';
import * as THREE from 'three';

function BackButton({ position, onClick, visible }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const setHoveringMenuItem = useNavigationStore(state => state.setHoveringMenuItem);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  const activeColors = colorThemes[currentTheme];
  const color = isThemeInverted ? activeColors.background : activeColors.text;

  useEffect(() => {
    if (groupRef.current) {
      gsap.to(groupRef.current.scale, {
        x: visible ? 1 : 0,
        y: visible ? 1 : 0,
        z: visible ? 1 : 0,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(groupRef.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: theme.animation.duration,
        ease: theme.animation.ease
      });
    }
  }, [visible, position]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    setHoveringMenuItem(hovered);
  }, [hovered, setHoveringMenuItem]);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={visible ? 1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        if (visible) onClick();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Invisible hit area - double the size of the arrow */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.25, 0.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Arrow shape using simple geometry */}
      <group scale={[0.008, 0.008, 0.008]} rotation={[0, 0, 0]}>
        {/* Arrow stem */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[12, 2, 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.6} />
        </mesh>
        {/* Arrow head top */}
        <mesh position={[-5, 3, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[8, 2, 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.6} />
        </mesh>
        {/* Arrow head bottom */}
        <mesh position={[-5, -3, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <boxGeometry args={[8, 2, 0.1]} />
          <meshBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.6} />
        </mesh>
      </group>
    </group>
  );
}

function MenuItem({ text, position, onClick, isActive, fontSize = 0.5, animateIn = false }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const setHoveringMenuItem = useNavigationStore(state => state.setHoveringMenuItem);
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  
  // Get color based on inversion state
  const activeColors = colorThemes[currentTheme];
  const color = isThemeInverted ? activeColors.background : activeColors.text;

  // Initial setup for animation
  useEffect(() => {
    if (groupRef.current && animateIn) {
      // Set initial state for animation
      groupRef.current.position.set(position[0], position[1] - 0.2, position[2]);
      groupRef.current.scale.set(0.8, 0.8, 0.8);
      if (meshRef.current) {
        meshRef.current.material.opacity = 0;
      }
      
      // Animate in
      gsap.to(groupRef.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: theme.animation.duration,
        ease: theme.animation.ease,
        delay: 0.8
      });
      
      gsap.to(groupRef.current.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: theme.animation.duration,
        ease: theme.animation.ease,
        delay: 0.8
      });
      
      if (meshRef.current) {
        gsap.to(meshRef.current.material, {
          opacity: isActive ? 1 : 0.7,
          duration: 0.6,
          ease: theme.animation.ease,
          delay: 0.8
        });
      }
    }
  }, [animateIn]);

  useEffect(() => {
    if (groupRef.current && !animateIn) {
      gsap.to(groupRef.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: theme.animation.duration,
        ease: theme.animation.ease
      });
    }
  }, [position, animateIn]);

  useEffect(() => {
    if (meshRef.current && !animateIn) {
      // Determine target opacity based on active and hover states
      let targetOpacity;
      if (isActive) {
        targetOpacity = 1; // Active items stay at full opacity
      } else if (hovered) {
        targetOpacity = 1; // Hovered items go to full opacity
      } else {
        targetOpacity = 0.5; // Non-active, non-hovered items are dimmed
      }
      
      gsap.to(meshRef.current.material, {
        opacity: targetOpacity,
        duration: 0.3
      });
    }
  }, [isActive, hovered, animateIn]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    setHoveringMenuItem(hovered); // Update global hover state
  }, [hovered, setHoveringMenuItem]);

  return (
    <group 
      ref={groupRef} 
      position={position} 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Text
        ref={meshRef}
        fontSize={fontSize}
        color={color}
        anchorX="left"
        anchorY="middle"
        font="/font/IBMPlexMono-Regular.ttf"
      >
        {text}
      </Text>
    </group>
  );
}

function MenuSystem() {
  const { viewport } = useThree();
  const { currentMenu, currentView, activeMenuItem, expandedSubmenuId, navigateToSubmenu, navigateToPage, navigateToSubpage, navigateToHome, goBack } = useNavigationStore();
  const canGoBack = useNavigationStore(state => state.canGoBack);
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const prevMenuRef = useRef(currentMenu);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Detect menu change to trigger animations
  useEffect(() => {
    if (prevMenuRef.current !== currentMenu) {
      setShouldAnimateIn(true);
      const timer = setTimeout(() => setShouldAnimateIn(false), 1500);
      prevMenuRef.current = currentMenu;
      return () => clearTimeout(timer);
    }
  }, [currentMenu]);

  // Calculate positions based on viewport
  const leftColumnWidth = viewport.width * theme.layout.leftColumnRatio;
  const leftColumnCenter = -viewport.width / 2 + leftColumnWidth / 2;

  // Main menu items - using spatial positioning
  const mainMenuItems = navigationData.mainMenu.map((item, index) => {
    const position = getMenuPosition('main', leftColumnCenter, index, navigationData.mainMenu.length, isMobile);

    return {
      ...item,
      position,
      isActive: activeMenuItem === item.id || expandedSubmenuId === item.id
    };
  });

  // Find the currently expanded submenu parent (if any)
  const expandedParent = expandedSubmenuId 
    ? navigationData.mainMenu.find(item => item.id === expandedSubmenuId)
    : null;

  // Dynamically get submenu items for the expanded parent
  const submenuItems = expandedParent?.submenu 
    ? expandedParent.submenu.map((item, index) => {
        const position = getMenuPosition('submenu', leftColumnCenter, index, expandedParent.submenu.length, isMobile);
        
        return {
          ...item,
          position,
          isActive: activeMenuItem === item.id
        };
      })
    : [];

  const handleMainMenuClick = (item) => {
    if (item.type === 'submenu') {
      // Toggle submenu - if clicking same one, it collapses; different one, it switches
      navigateToSubmenu(item.id);
    } else if (item.type === 'page') {
      // If we're in a submenu and clicking a main menu page, collapse first
      if (expandedSubmenuId) {
        navigateToSubmenu(null); // Collapse
        setTimeout(() => {
          navigateToPage(item.id, item.id);
        }, theme.animation.duration * 1000);
      } else {
        navigateToPage(item.id, item.id);
      }
    }
  };

  const handleSubmenuClick = (item) => {
    if (item.type === 'page') {
      // Use navigateToSubpage to preserve the expandedSubmenuId context
      navigateToSubpage(item.id, expandedSubmenuId);
    } else if (item.type === 'submenu') {
      // Support nested submenus in the future
      navigateToSubmenu(item.id);
    }
  };

  // Calculate back button position - above the entire active menu
  const getBackButtonPosition = () => {
    const xOffset = 0.06; // Horizontal offset for the back button
    const yOffset = 0.4; // Vertical offset above the top menu item
    
    // Check if we're viewing an actual subpage (not just the submenu landing page)
    const isOnSubpage = expandedSubmenuId && currentView && currentView !== expandedSubmenuId;
    
    if (isOnSubpage && submenuItems.length > 0) {
      // Viewing a subpage within a submenu - position above the submenu
      const topSubmenuItem = submenuItems[0];
      return [topSubmenuItem.position[0] + xOffset, topSubmenuItem.position[1] + yOffset, topSubmenuItem.position[2]];
    }
    
    // On main menu page OR submenu landing page (like Work) - position above the main menu
    const topMainItem = mainMenuItems[0];
    if (topMainItem) {
      return [topMainItem.position[0] + xOffset, topMainItem.position[1] + yOffset, topMainItem.position[2]];
    }
    
    // Fallback
    return [leftColumnCenter + xOffset, yOffset, 0];
  };

  const showBackButton = canGoBack();

  return (
    <group>
      {/* Back Button - appears above active menu when not at home */}
      <BackButton
        position={getBackButtonPosition()}
        onClick={goBack}
        visible={showBackButton}
      />

      {/* Home label - always rendered */}
      <MenuItem
        text="Home"
        position={[leftColumnCenter - 3.0, 0, 0]}
        fontSize={0.15}
        onClick={() => navigateToHome()}
      />

      {/* Main Menu - always rendered */}
      {mainMenuItems.map((item) => (
        <MenuItem
          key={item.id}
          text={item.title}
          position={item.position}
          onClick={() => handleMainMenuClick(item)}
          isActive={item.isActive}
          fontSize={0.15}
          animateIn={false}
        />
      ))}

      {/* Dynamic Submenu - rendered when any submenu is expanded */}
      {submenuItems.map((item) => (
        <MenuItem
          key={item.id}
          text={item.title}
          position={item.position}
          onClick={() => handleSubmenuClick(item)}
          isActive={item.isActive}
          fontSize={0.15}
          animateIn={shouldAnimateIn}
        />
      ))}
    </group>
  );
}

export default MenuSystem;
