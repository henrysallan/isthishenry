import { useRef, useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { theme, getMenuPosition } from '../config/theme';
import gsap from 'gsap';

function MenuItem({ text, position, onClick, isActive, fontSize = 0.5, color = '#000000', animateIn = false }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

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
      gsap.to(meshRef.current.material, {
        opacity: isActive ? 1 : (hovered ? 0.9 : 0.7),
        duration: 0.3
      });
    }
  }, [isActive, hovered, animateIn]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

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
  const { currentMenu, currentView, activeMenuItem, navigateToMenu, navigateToPage, navigateToHome } = useNavigationStore();
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);
  const prevMenuRef = useRef(currentMenu);

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
  const leftColumnCenter = -viewport.width / 2 + leftColumnWidth / 2; // Center of left 3/7

  // Main menu items - using spatial positioning
  const mainMenuItems = navigationData.mainMenu.map((item, index) => {
    const position = getMenuPosition('main', leftColumnCenter, index, navigationData.mainMenu.length);

    return {
      ...item,
      position,
      isActive: activeMenuItem === item.id
    };
  });

  // Work submenu items (if work menu is active)
  const workSubmenu = navigationData.mainMenu.find(item => item.id === 'work')?.submenu || [];
  const workSubmenuItems = currentMenu === 'work' 
    ? workSubmenu.map((item, index) => {
        const position = getMenuPosition('submenu', leftColumnCenter, index, workSubmenu.length);
        
        return {
          ...item,
          position,
          isActive: activeMenuItem === item.id
        };
      })
    : [];

  // Parent menu item position when in submenu
  const parentMenuPosition = currentMenu === 'work' 
    ? getMenuPosition('parent', leftColumnCenter, 0, 1)
    : null;

  const handleMainMenuClick = (item) => {
    if (item.type === 'submenu') {
      // If we're already in a different submenu, go back to main first
      if (currentMenu !== 'main' && currentMenu !== item.id) {
        navigateToMenu('main');
        // Then navigate to the new submenu after animation
        setTimeout(() => {
          navigateToMenu(item.id);
        }, theme.animation.duration * 1000);
      } else if (currentMenu === item.id) {
        // Click on the active submenu parent goes back to main
        navigateToMenu('main');
      } else {
        navigateToMenu(item.id);
      }
    } else if (item.type === 'page') {
      // If clicking a page from within a submenu, navigate back first
      if (currentMenu !== 'main') {
        navigateToMenu('main');
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
      navigateToPage(item.id, item.id);
    }
  };

  return (
    <group>
      {/* Home label - always rendered */}
      <MenuItem
        text="Home"
        position={[leftColumnCenter - 3.0, 0, 0]}
        fontSize={0.15}
        color={theme.colors.text}
        onClick={() => navigateToHome()}
      />

      {/* Main Menu - always rendered */}
      {mainMenuItems.map((item, index) => (
        <MenuItem
          key={item.id}
          text={item.title}
          position={item.position}
          onClick={() => handleMainMenuClick(item)}
          isActive={item.isActive}
          color={theme.colors.textLight}
          fontSize={0.15}
          animateIn={false}
        />
      ))}

      {/* Work Submenu */}
      {workSubmenuItems.map((item, index) => (
        <MenuItem
          key={item.id}
          text={item.title}
          position={item.position}
          onClick={() => handleSubmenuClick(item)}
          isActive={item.isActive}
          color={theme.colors.text}
          fontSize={0.15}
          animateIn={shouldAnimateIn}
        />
      ))}
    </group>
  );
}

export default MenuSystem;
