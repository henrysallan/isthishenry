import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes } from '../config/theme';
import './LandingOverlay.css';

// Simple 2D noise function for smooth random movement
const createNoise = () => {
  // Permutation table for noise
  const perm = [];
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];

  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (hash, x, y) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };

  return (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const A = perm[X] + Y;
    const B = perm[X + 1] + Y;
    return lerp(
      lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
      lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
      v
    );
  };
};

// Create a single noise instance
const noise = createNoise();

// Generate random bezier points avoiding exclusion zones
const generateBezierPoints = (windowWidth, windowHeight, numPoints = 6) => {
  const points = [];
  const padding = 60; // Padding from screen edges
  
  // Exclusion zones: upper-left text area and center cutout
  const exclusionZones = [
    { x: 0, y: 0, width: 400, height: 200 }, // Upper-left text area
    { 
      x: windowWidth / 2 - 200, 
      y: windowHeight / 2 - 175, 
      width: 400, 
      height: 350 
    }, // Center cutout area (with margin)
  ];
  
  const isInExclusionZone = (x, y) => {
    for (const zone of exclusionZones) {
      if (x >= zone.x && x <= zone.x + zone.width &&
          y >= zone.y && y <= zone.y + zone.height) {
        return true;
      }
    }
    return false;
  };
  
  let attempts = 0;
  while (points.length < numPoints && attempts < 500) {
    attempts++;
    const x = padding + Math.random() * (windowWidth - padding * 2);
    const y = padding + Math.random() * (windowHeight - padding * 2);
    
    if (!isInExclusionZone(x, y)) {
      // Generate handle offsets (symmetric by default) - long minimum distance
      const handleLength = 120 + Math.random() * 80; // Min 120px, max 200px
      const handleAngle = Math.random() * Math.PI * 2;
      
      // Random noise offsets for each point (so they drift differently)
      const noiseOffsetX = Math.random() * 1000;
      const noiseOffsetY = Math.random() * 1000;
      
      points.push({
        id: points.length,
        // Base positions (original)
        baseX: x,
        baseY: y,
        baseH1x: x - Math.cos(handleAngle) * handleLength,
        baseH1y: y - Math.sin(handleAngle) * handleLength,
        baseH2x: x + Math.cos(handleAngle) * handleLength,
        baseH2y: y + Math.sin(handleAngle) * handleLength,
        // Current positions (will be animated)
        x,
        y,
        h1x: x - Math.cos(handleAngle) * handleLength,
        h1y: y - Math.sin(handleAngle) * handleLength,
        h2x: x + Math.cos(handleAngle) * handleLength,
        h2y: y + Math.sin(handleAngle) * handleLength,
        // Noise offsets for unique drift per point
        noiseOffsetX,
        noiseOffsetY,
      });
    }
  }
  
  // Sort points roughly by position to create a more coherent path
  points.sort((a, b) => {
    const angleA = Math.atan2(a.baseY - windowHeight / 2, a.baseX - windowWidth / 2);
    const angleB = Math.atan2(b.baseY - windowHeight / 2, b.baseX - windowWidth / 2);
    return angleA - angleB;
  });
  
  // Reassign IDs after sorting
  points.forEach((p, i) => p.id = i);
  
  return points;
};

function LandingOverlay() {
  // Get theme state
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const isDismissed = useNavigationStore(state => state.isLandingDismissed);
  const setLandingDismissed = useNavigationStore(state => state.setLandingDismissed);
  const activeColors = colorThemes[currentTheme];
  
  // Calculate theme colors (same logic as rest of site)
  const bgColor = isThemeInverted ? activeColors.text : activeColors.background;
  const strokeColor = isThemeInverted ? activeColors.background : activeColors.text;
  
  const overlayRef = useRef(null);
  const rectangleRef = useRef(null);
  const cutoutRef = useRef(null);
  const cutoutHitRef = useRef(null);
  const cornersRef = useRef(null);
  const cornerElementsRef = useRef([]); // Cache corner bracket elements
  const startHereRef = useRef(null);
  const startHereHitRef = useRef(null);
  const cursorToTextLineRef = useRef(null);
  const bezierSystemRef = useRef(null);
  const bezierPathRef = useRef(null);
  const bezierMaskRectRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);
  const [bezierDrawProgress, setBezierDrawProgress] = useState(0);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [shockwaves, setShockwaves] = useState([]);
  const shockwavesRef = useRef([]);
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const driftPosRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 200, height: 150 });
  const targetSizeRef = useRef({ width: 200, height: 150 });
  const animationFrameRef = useRef(null);
  const bezierDriftRef = useRef(null);
  const isReturningRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const isLoopPausedRef = useRef(false);
  const hoverDebounceRef = useRef(null);
  const [hoverEffectTrigger, setHoverEffectTrigger] = useState(0);
  
  // Debounced hover setter to prevent rapid flickering at edges
  const setIsHoveredDebounced = useCallback((value) => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
    if (value) {
      // Small delay before entering hover to prevent flicker
      hoverDebounceRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 30);
    } else {
      // Longer delay leaving to prevent edge flickering
      hoverDebounceRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 100);
    }
  }, []);
  
  // Bezier path state
  const [numBezierPoints, setNumBezierPoints] = useState(window.innerWidth <= 768 ? 4 : 6);
  const [bezierPoints, setBezierPoints] = useState([]);
  const [dragState, setDragState] = useState({ isDragging: false, pointId: null, handleType: null });
  const [hoveredPoint, setHoveredPoint] = useState({ pointId: null, handleType: null });
  const hoveredPointRef = useRef({ pointId: null, handleType: null });
  const dragStateRef = useRef({ isDragging: false, pointId: null, handleType: null });
  const dragStartRef = useRef({ x: 0, y: 0, pointX: 0, pointY: 0 });
  const wasDraggingRef = useRef(false);

  // Keep refs in sync with state for animation closure
  useEffect(() => {
    hoveredPointRef.current = hoveredPoint;
  }, [hoveredPoint]);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    shockwavesRef.current = shockwaves;
  }, [shockwaves]);

  // Accelerometer data ref for mobile
  const accelerometerRef = useRef({ x: 0, y: 0 });

  // Corner bracket dimensions
  const cornerOffset = 5; // Distance from rectangle edge
  const cornerHorizontalLength = 8; // Length of horizontal part
  const cornerVerticalLength = 8; // Length of vertical part
  
  // Screen corner bracket dimensions
  const screenCornerInset = 8; // Distance from screen edge
  const screenCornerLength = 50; // Length of each arm of the L

  // Initialize bezier points on mount and when numBezierPoints changes
  useEffect(() => {
    const points = generateBezierPoints(window.innerWidth, window.innerHeight, numBezierPoints);
    setBezierPoints(points);
  }, [numBezierPoints]);

  // Accelerometer listener for mobile
  useEffect(() => {
    if (!isMobile) return;
    
    let motionListenerAdded = false;
    
    const handleMotion = (event) => {
      // accelerationIncludingGravity gives us tilt data
      // x: left/right tilt, y: forward/back tilt
      const accel = event.accelerationIncludingGravity;
      if (accel && accel.x !== null && accel.y !== null) {
        // Normalize and invert as needed for natural feel
        // On iOS/Android, tilting right gives positive x, tilting forward gives positive y
        accelerometerRef.current = {
          x: (accel.x || 0) * 0.2,
          y: (accel.y || 0) * -0.2
        };
      }
    };
    
    const addMotionListener = () => {
      if (!motionListenerAdded) {
        window.addEventListener('devicemotion', handleMotion);
        motionListenerAdded = true;
      }
    };
    
    // Check if we need to request permission (iOS 13+)
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      
      // Request permission on any user interaction with the page
      const requestPermission = async () => {
        try {
          const permission = await DeviceMotionEvent.requestPermission();
          console.log('Motion permission:', permission);
          if (permission === 'granted') {
            addMotionListener();
          }
        } catch (e) {
          console.log('Accelerometer permission error:', e);
        }
      };
      
      // Attach to multiple event types to ensure we catch user gesture
      const onUserGesture = () => {
        requestPermission();
        // Remove all listeners after first trigger
        window.removeEventListener('touchstart', onUserGesture);
        window.removeEventListener('touchend', onUserGesture);
        window.removeEventListener('click', onUserGesture);
      };
      
      window.addEventListener('touchstart', onUserGesture);
      window.addEventListener('touchend', onUserGesture);
      window.addEventListener('click', onUserGesture);
      
      return () => {
        window.removeEventListener('devicemotion', handleMotion);
        window.removeEventListener('touchstart', onUserGesture);
        window.removeEventListener('touchend', onUserGesture);
        window.removeEventListener('click', onUserGesture);
      };
    } else if (typeof DeviceMotionEvent !== 'undefined') {
      // Non-iOS or older browsers - just add listener directly
      addMotionListener();
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [isMobile]);

  // Noise-based drift animation for bezier points
  useEffect(() => {
    if (bezierPoints.length === 0) return;
    
    const driftSpeed = 0.0002; // Very slow drift
    const driftAmount = 150; // Max pixels to drift
    const handleAngleDrift = 0.3; // Max radians to drift handle angle
    const handleDistanceDrift = 15; // Max pixels to drift handle distance
    const lerpFactor = 0.01; // Smooth interpolation factor
    const shockwavePushForce = 0.8; // Softer force applied by shockwave
    const shockwaveWidth = 60; // Wider ring for smoother effect
    const velocityDecay = 0.96; // Friction - velocity multiplied by this each frame
    let startTime = Date.now();
    let frameCount = 0;
    
    const animateDrift = () => {
      // Skip updates during animations to prevent jitter
      if (isAnimatingRef.current || isLoopPausedRef.current) {
        bezierDriftRef.current = requestAnimationFrame(animateDrift);
        return;
      }
      
      frameCount++;
      // Only update state every 3 frames to reduce re-renders
      if (frameCount % 3 !== 0) {
        bezierDriftRef.current = requestAnimationFrame(animateDrift);
        return;
      }
      
      const elapsed = (Date.now() - startTime) * driftSpeed;
      
      setBezierPoints(prev => {
        return prev.map(p => {
          // Initialize velocity if not present
          const vx = p.vx || 0;
          const vy = p.vy || 0;
          
          // If this specific point is being dragged or hovered, freeze it
          const isDragged = dragStateRef.current.isDragging && dragStateRef.current.pointId === p.id;
          const isHovered = hoveredPointRef.current.pointId === p.id;
          
          if (isDragged || isHovered) {
            return { ...p, vx: 0, vy: 0 }; // Reset velocity when frozen
          }
          
          // Calculate shockwave push force (accumulate into velocity)
          let pushX = 0;
          let pushY = 0;
          
          // Add accelerometer force on mobile
          pushX += accelerometerRef.current.x;
          pushY += accelerometerRef.current.y;
          
          shockwavesRef.current.forEach(sw => {
            const dx = p.x - sw.x;
            const dy = p.y - sw.y;
            const distToPoint = Math.sqrt(dx * dx + dy * dy);
            
            // Check if point is within the shockwave ring
            const innerRadius = sw.radius - shockwaveWidth / 2;
            const outerRadius = sw.radius + shockwaveWidth / 2;
            
            if (distToPoint >= innerRadius && distToPoint <= outerRadius && distToPoint > 0) {
              // Calculate how centered in the ring (1 at center, 0 at edges)
              const ringCenter = sw.radius;
              const distFromRingCenter = Math.abs(distToPoint - ringCenter);
              const ringFalloff = 1 - (distFromRingCenter / (shockwaveWidth / 2));
              
              // Calculate push direction (away from shockwave center)
              const pushStrength = shockwavePushForce * ringFalloff * (1 - sw.radius / sw.maxRadius);
              pushX += (dx / distToPoint) * pushStrength;
              pushY += (dy / distToPoint) * pushStrength;
            }
          });
          
          // Update velocity with push force and apply decay
          let newVx = (vx + pushX) * velocityDecay;
          let newVy = (vy + pushY) * velocityDecay;
          
          // Screen edge collision detection
          const padding = 30; // Keep points this far from edges
          const bounce = 0.6; // Bounce factor (0-1, lower = less bouncy)
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          
          // Check horizontal boundaries
          if (p.x < padding) {
            newVx = Math.abs(newVx) * bounce; // Bounce right
          } else if (p.x > screenWidth - padding) {
            newVx = -Math.abs(newVx) * bounce; // Bounce left
          }
          
          // Check vertical boundaries
          if (p.y < padding) {
            newVy = Math.abs(newVy) * bounce; // Bounce down
          } else if (p.y > screenHeight - padding) {
            newVy = -Math.abs(newVy) * bounce; // Bounce up
          }
          
          // Generate noise values for anchor point position
          const noiseX = noise(p.noiseOffsetX + elapsed, 0) * driftAmount;
          const noiseY = noise(0, p.noiseOffsetY + elapsed) * driftAmount;
          
          // Calculate base handle angle and distance from anchor
          const baseH1dx = p.baseH1x - p.baseX;
          const baseH1dy = p.baseH1y - p.baseY;
          const baseAngle = Math.atan2(baseH1dy, baseH1dx);
          const baseDistance = Math.sqrt(baseH1dx * baseH1dx + baseH1dy * baseH1dy);
          
          // Generate noise for handle angle and distance (same noise affects both handles symmetrically)
          const angleNoise = noise(p.noiseOffsetX + 500 + elapsed, 100) * handleAngleDrift;
          const distanceNoise = noise(100, p.noiseOffsetY + 500 + elapsed) * handleDistanceDrift;
          
          // Calculate drifted angle and distance
          const driftedAngle = baseAngle + angleNoise;
          const driftedDistance = baseDistance + distanceNoise;
          
          // Calculate target handle positions (h1 and h2 are always opposite)
          const targetX = p.baseX + noiseX;
          const targetY = p.baseY + noiseY;
          const targetH1x = targetX + Math.cos(driftedAngle) * driftedDistance;
          const targetH1y = targetY + Math.sin(driftedAngle) * driftedDistance;
          const targetH2x = targetX - Math.cos(driftedAngle) * driftedDistance;
          const targetH2y = targetY - Math.sin(driftedAngle) * driftedDistance;
          
          // Calculate new positions
          let newX = p.x + (targetX - p.x) * lerpFactor + newVx;
          let newY = p.y + (targetY - p.y) * lerpFactor + newVy;
          let newBaseX = p.baseX + newVx * 0.3;
          let newBaseY = p.baseY + newVy * 0.3;
          
          // Clamp positions to screen bounds
          newX = Math.max(padding, Math.min(screenWidth - padding, newX));
          newY = Math.max(padding, Math.min(screenHeight - padding, newY));
          newBaseX = Math.max(padding, Math.min(screenWidth - padding, newBaseX));
          newBaseY = Math.max(padding, Math.min(screenHeight - padding, newBaseY));
          
          // Lerp current positions toward targets, plus apply velocity
          return {
            ...p,
            vx: newVx,
            vy: newVy,
            x: newX,
            y: newY,
            h1x: p.h1x + (targetH1x - p.h1x) * lerpFactor + newVx,
            h1y: p.h1y + (targetH1y - p.h1y) * lerpFactor + newVy,
            h2x: p.h2x + (targetH2x - p.h2x) * lerpFactor + newVx,
            h2y: p.h2y + (targetH2y - p.h2y) * lerpFactor + newVy,
            // Also push the base positions so the point doesn't snap back immediately
            baseX: newBaseX,
            baseY: newBaseY,
            baseH1x: p.baseH1x + newVx * 0.3,
            baseH1y: p.baseH1y + newVy * 0.3,
            baseH2x: p.baseH2x + newVx * 0.3,
            baseH2y: p.baseH2y + newVy * 0.3,
          };
        });
      });
      
      bezierDriftRef.current = requestAnimationFrame(animateDrift);
    };
    
    animateDrift();
    
    return () => {
      if (bezierDriftRef.current) {
        cancelAnimationFrame(bezierDriftRef.current);
      }
    };
  }, [bezierPoints.length, isDismissed]);

  useEffect(() => {
    // Calculate center position and window size
    const updateDimensions = () => {
      setCenterPos({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setIsMobile(window.innerWidth <= 768);
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Shockwave animation
  useEffect(() => {
    if (shockwaves.length === 0) return;
    
    const shockwaveSpeed = 8; // Pixels per frame
    let animationId;
    
    const animateShockwaves = () => {
      setShockwaves(prev => {
        const updated = prev.map(sw => ({
          ...sw,
          radius: sw.radius + shockwaveSpeed,
          opacity: Math.max(0, 1 - sw.radius / sw.maxRadius)
        })).filter(sw => sw.radius < sw.maxRadius);
        
        return updated;
      });
      
      animationId = requestAnimationFrame(animateShockwaves);
    };
    
    animationId = requestAnimationFrame(animateShockwaves);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [shockwaves.length > 0]);

  // Handle click to create shockwave
  const handleOverlayClick = useCallback((e) => {
    // Don't create shockwave if clicking on interactive elements
    if (e.target.closest('.rectangle-stroke') || 
        e.target.closest('.bezier-point-group') ||
        e.target.closest('.start-here-hit') ||
        e.target.closest('text')) {
      return;
    }
    
    const newShockwave = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
      radius: 0,
      maxRadius: Math.max(windowSize.width, windowSize.height) * 0.8,
      opacity: 1
    };
    
    setShockwaves(prev => [...prev, newShockwave]);
  }, [windowSize]);

  const handleClick = (e) => {
    // Stop propagation so shockwave doesn't fire
    e.stopPropagation();
    
    // Don't trigger click if we were dragging
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    if (!isDrawn) return;
    
    // Prevent triggering if animation already in progress
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    // Pause the animation loop so it doesn't fight with GSAP
    isLoopPausedRef.current = true;
    
    // Reset hover state to prevent interference
    setIsHovered(false);

    const container = overlayRef.current;
    if (!container) {
      isAnimatingRef.current = false;
      return;
    }
    
    // Kill ALL related gsap tweens to prevent conflicts
    gsap.killTweensOf(targetSizeRef.current);
    gsap.killTweensOf(container);
    if (bezierSystemRef.current) {
      gsap.killTweensOf(bezierSystemRef.current);
    }

    // Immediately fade out the bezier system
    if (bezierSystemRef.current) {
      gsap.to(bezierSystemRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: 'power1.out'
      });
    }

    // Animate the size expansion smoothly
    const expandSize = Math.max(window.innerWidth, window.innerHeight) * 2;
    
    gsap.to(targetSizeRef.current, {
      width: expandSize,
      height: expandSize,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!rectangleRef.current || !cutoutRef.current) return;

        // Keep sizeRef in sync to prevent re-render glitches
        sizeRef.current = { ...targetSizeRef.current };

        // Calculate perimeter for stroke-dasharray
        const perimeter = 2 * (targetSizeRef.current.width + targetSizeRef.current.height);

        // Update with current animated values
        const newX = centerPos.x - targetSizeRef.current.width / 2 + driftPosRef.current.x;
        const newY = centerPos.y - targetSizeRef.current.height / 2 + driftPosRef.current.y;
        
        rectangleRef.current.setAttribute('x', newX);
        rectangleRef.current.setAttribute('y', newY);
        rectangleRef.current.setAttribute('width', targetSizeRef.current.width);
        rectangleRef.current.setAttribute('height', targetSizeRef.current.height);
        rectangleRef.current.style.strokeDasharray = perimeter;
        
        cutoutRef.current.setAttribute('x', newX);
        cutoutRef.current.setAttribute('y', newY);
        cutoutRef.current.setAttribute('width', targetSizeRef.current.width);
        cutoutRef.current.setAttribute('height', targetSizeRef.current.height);

        // Update bezier mask rect during expansion
        if (bezierMaskRectRef.current) {
          bezierMaskRectRef.current.setAttribute('x', newX);
          bezierMaskRectRef.current.setAttribute('y', newY);
          bezierMaskRectRef.current.setAttribute('width', targetSizeRef.current.width);
          bezierMaskRectRef.current.setAttribute('height', targetSizeRef.current.height);
        }

        // Update corner brackets during expansion
        if (cornersRef.current) {
          updateCornerBrackets(newX, newY, targetSizeRef.current.width, targetSizeRef.current.height);
        }

        // Update \"start here\" text position during expansion
        if (startHereRef.current) {
          startHereRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x);
          startHereRef.current.setAttribute('y', newY - 10);
        }
        if (startHereHitRef.current) {
          startHereHitRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x - 50);
          startHereHitRef.current.setAttribute('y', newY - 28);
        }

        // Update cursor-to-text line endpoint during expansion - find closest point
        if (cursorToTextLineRef.current) {
          const textCenterX = centerPos.x + driftPosRef.current.x;
          const textCenterY = newY - 16;
          const textHalfWidth = 42;
          const textHalfHeight = 8;
          const textLeft = textCenterX - textHalfWidth;
          const textRight = textCenterX + textHalfWidth;
          const textTop = textCenterY - textHalfHeight;
          const textBottom = textCenterY + textHalfHeight;
          const cx = cursorPosRef.current.x;
          const cy = cursorPosRef.current.y;
          const closestX = Math.max(textLeft, Math.min(cx, textRight));
          const closestY = Math.max(textTop, Math.min(cy, textBottom));
          cursorToTextLineRef.current.setAttribute('x2', closestX);
          cursorToTextLineRef.current.setAttribute('y2', closestY);
        }
      },
      onComplete: () => {
        // Ensure refs are set to the final expanded size
        const expandSize = Math.max(window.innerWidth, window.innerHeight) * 2;
        sizeRef.current = { width: expandSize, height: expandSize };
        targetSizeRef.current = { width: expandSize, height: expandSize };
        
        // Fade out the overlay and mark as dismissed
        gsap.to(container, {
          opacity: 0,
          duration: 0.3,
          ease: 'power1.out',
          onComplete: () => {
            setLandingDismissed(true);
            container.style.pointerEvents = 'none';
            isAnimatingRef.current = false;
          }
        });
      }
    });
  };

  // Handle return to landing page (reverse animation)
  const handleReturn = useCallback(() => {
    const container = overlayRef.current;
    if (!container) return;
    
    // Prevent triggering if animation already in progress
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    
    // Pause the animation loop so it doesn't fight with GSAP
    isLoopPausedRef.current = true;

    // Mark as returning to prevent hover interference
    isReturningRef.current = true;
    
    // Kill ALL related gsap tweens to prevent conflicts
    gsap.killTweensOf(targetSizeRef.current);
    gsap.killTweensOf(container);
    if (bezierSystemRef.current) {
      gsap.killTweensOf(bezierSystemRef.current);
    }
    
    // Always start from expanded size when returning
    const expandSize = Math.max(window.innerWidth, window.innerHeight) * 2;
    sizeRef.current = { width: expandSize, height: expandSize };
    targetSizeRef.current = { width: expandSize, height: expandSize };
    
    // Re-enable pointer events
    container.style.pointerEvents = 'auto';
    
    // Pre-set DOM elements to expanded state BEFORE fading in
    const newX = centerPos.x - expandSize / 2 + driftPosRef.current.x;
    const newY = centerPos.y - expandSize / 2 + driftPosRef.current.y;
    const perimeter = 2 * (expandSize + expandSize);
    
    if (rectangleRef.current) {
      rectangleRef.current.setAttribute('x', newX);
      rectangleRef.current.setAttribute('y', newY);
      rectangleRef.current.setAttribute('width', expandSize);
      rectangleRef.current.setAttribute('height', expandSize);
      rectangleRef.current.style.strokeDasharray = perimeter;
    }
    if (cutoutRef.current) {
      cutoutRef.current.setAttribute('x', newX);
      cutoutRef.current.setAttribute('y', newY);
      cutoutRef.current.setAttribute('width', expandSize);
      cutoutRef.current.setAttribute('height', expandSize);
    }
    if (bezierMaskRectRef.current) {
      bezierMaskRectRef.current.setAttribute('x', newX);
      bezierMaskRectRef.current.setAttribute('y', newY);
      bezierMaskRectRef.current.setAttribute('width', expandSize);
      bezierMaskRectRef.current.setAttribute('height', expandSize);
    }
    
    // Fade in the overlay
    gsap.to(container, {
      opacity: 1,
      duration: 0.3,
      ease: 'power1.in',
      onComplete: () => {
        // Animate the size back to original
        gsap.to(targetSizeRef.current, {
          width: 200,
          height: 150,
          duration: 0.8,
          ease: 'power4.inOut',
          onUpdate: () => {
            if (!rectangleRef.current || !cutoutRef.current) return;
            
            // Keep sizeRef in sync during return animation
            sizeRef.current = { width: targetSizeRef.current.width, height: targetSizeRef.current.height };

            // Calculate perimeter for stroke-dasharray
            const perimeter = 2 * (targetSizeRef.current.width + targetSizeRef.current.height);

            // Update with current animated values
            const newX = centerPos.x - targetSizeRef.current.width / 2 + driftPosRef.current.x;
            const newY = centerPos.y - targetSizeRef.current.height / 2 + driftPosRef.current.y;
            
            rectangleRef.current.setAttribute('x', newX);
            rectangleRef.current.setAttribute('y', newY);
            rectangleRef.current.setAttribute('width', targetSizeRef.current.width);
            rectangleRef.current.setAttribute('height', targetSizeRef.current.height);
            rectangleRef.current.style.strokeDasharray = perimeter;
            
            cutoutRef.current.setAttribute('x', newX);
            cutoutRef.current.setAttribute('y', newY);
            cutoutRef.current.setAttribute('width', targetSizeRef.current.width);
            cutoutRef.current.setAttribute('height', targetSizeRef.current.height);

            // Update bezier mask rect
            if (bezierMaskRectRef.current) {
              bezierMaskRectRef.current.setAttribute('x', newX);
              bezierMaskRectRef.current.setAttribute('y', newY);
              bezierMaskRectRef.current.setAttribute('width', targetSizeRef.current.width);
              bezierMaskRectRef.current.setAttribute('height', targetSizeRef.current.height);
            }

            // Update corner brackets
            if (cornersRef.current) {
              updateCornerBrackets(newX, newY, targetSizeRef.current.width, targetSizeRef.current.height);
            }

            // Update "start here" text position
            if (startHereRef.current) {
              startHereRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x);
              startHereRef.current.setAttribute('y', newY - 10);
            }
            if (startHereHitRef.current) {
              startHereHitRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x - 50);
              startHereHitRef.current.setAttribute('y', newY - 28);
            }

            // Update cursor-to-text line endpoint - find closest point
            if (cursorToTextLineRef.current) {
              const textCenterX = centerPos.x + driftPosRef.current.x;
              const textCenterY = newY - 16;
              const textHalfWidth = 42;
              const textHalfHeight = 8;
              const textLeft = textCenterX - textHalfWidth;
              const textRight = textCenterX + textHalfWidth;
              const textTop = textCenterY - textHalfHeight;
              const textBottom = textCenterY + textHalfHeight;
              const cx = cursorPosRef.current.x;
              const cy = cursorPosRef.current.y;
              const closestX = Math.max(textLeft, Math.min(cx, textRight));
              const closestY = Math.max(textTop, Math.min(cy, textBottom));
              cursorToTextLineRef.current.setAttribute('x2', closestX);
              cursorToTextLineRef.current.setAttribute('y2', closestY);
            }
          },
          onComplete: () => {
            // Ensure refs are at the correct final state
            sizeRef.current = { width: 200, height: 150 };
            targetSizeRef.current = { width: 200, height: 150 };
            
            // NOW update React state - after all animations complete
            setLandingDismissed(false);
            
            // Fade in the bezier system
            if (bezierSystemRef.current) {
              gsap.to(bezierSystemRef.current, {
                opacity: 1,
                duration: 0.3,
                ease: 'power1.out'
              });
            }
            
            // Animation complete - delay resuming the loop to prevent jitter
            isReturningRef.current = false;
            isAnimatingRef.current = false;
            
            // Wait a frame before resuming the animation loop
            setTimeout(() => {
              isLoopPausedRef.current = false;
              // Trigger hover effect to re-evaluate and apply current hover state
              setHoverEffectTrigger(prev => prev + 1);
            }, 100);
          }
        });
      }
    });
  }, [setLandingDismissed, centerPos]);

  // Listen for return signal from ReturnArrow
  useEffect(() => {
    if (isDismissed === 'returning') {
      handleReturn();
    }
  }, [isDismissed, handleReturn]);

  // Track mouse/touch position for cursor-to-point lines (use ref to avoid re-renders)
  const mousePosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  useEffect(() => {
    const updateCursorLines = (x, y) => {
      // Update cursor-to-text line
      if (cursorToTextLineRef.current) {
        cursorToTextLineRef.current.setAttribute('x1', x);
        cursorToTextLineRef.current.setAttribute('y1', y);
      }
      // Update cursor-to-bezier lines
      if (bezierSystemRef.current) {
        const lines = bezierSystemRef.current.querySelectorAll('.cursor-to-bezier-line');
        lines.forEach(line => {
          line.setAttribute('x1', x);
          line.setAttribute('y1', y);
        });
      }
    };
    
    const handleMouseMove = (e) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      updateCursorLines(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mousePosRef.current = { x: touch.clientX, y: touch.clientY };
        updateCursorLines(touch.clientX, touch.clientY);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    // Wait for site to load behind, then draw the rectangle
    const drawTimer = setTimeout(() => {
      if (rectangleRef.current && cutoutRef.current) {
        // First animate the stroke drawing in
        gsap.to(rectangleRef.current, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: 'power4.inOut'
        });
        
        // Start the cutout opacity after 900ms
        setTimeout(() => {
          if (cutoutRef.current) {
            cutoutRef.current.style.opacity = '1';
          }
          setIsDrawn(true);
          
          // Animate bezier system drawing in
          gsap.to({ progress: 0 }, {
            progress: 1,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: function() {
              setBezierDrawProgress(this.targets()[0].progress);
            },
            onComplete: () => {
              // Fade in "Start Here" text after bezier draws
              if (startHereRef.current) {
                gsap.to(startHereRef.current, {
                  fillOpacity: 0.5,
                  duration: 0.5,
                  ease: 'power2.out'
                });
              }
            }
          });
        }, 900);
      }
    }, 500); // Small delay before drawing starts

    return () => clearTimeout(drawTimer);
  }, []);

  // Handle hover scaling
  useEffect(() => {
    // Don't change target size during any animation
    if (isReturningRef.current || isAnimatingRef.current || isLoopPausedRef.current) {
      return;
    }
    
    if (isHovered) {
      targetSizeRef.current = { width: 280, height: 210 };
    } else {
      targetSizeRef.current = { width: 200, height: 150 };
    }
  }, [isHovered, hoverEffectTrigger]);

  // Handle cursor drift effect
  useEffect(() => {
    if (!isDrawn) return;

    const startTime = Date.now();
    const dampingDuration = 1000; // 100ms damping period

    const handleMouseMove = (e) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        cursorPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    // Smooth drift animation loop
    let frameCount = 0;
    const animate = () => {
      if (!rectangleRef.current || !cutoutRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Skip updates if GSAP animation is in progress
      if (isLoopPausedRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      frameCount++;

      // Calculate damping factor for first 100ms
      const elapsed = Date.now() - startTime;
      const dampingFactor = Math.min(elapsed / dampingDuration, 1); // 0 to 1 over 100ms

      // Get window center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Calculate direction to cursor from screen center
      const deltaX = cursorPosRef.current.x - centerX;
      const deltaY = cursorPosRef.current.y - centerY;

      // Calculate target drift position (max 20px)
      const maxDrift = 900;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const targetX = distance > 0 ? (deltaX / distance) * Math.min(distance * 0.10, maxDrift) : 0;
      const targetY = distance > 0 ? (deltaY / distance) * Math.min(distance * 0.10, maxDrift) : 0;

      // Apply damping to target values
      const dampedTargetX = targetX * dampingFactor;
      const dampedTargetY = targetY * dampingFactor;

      // Lerp to target position (smooth easing)
      const lerpFactor = 0.1;
      driftPosRef.current.x += (dampedTargetX - driftPosRef.current.x) * lerpFactor;
      driftPosRef.current.y += (dampedTargetY - driftPosRef.current.y) * lerpFactor;

      // Lerp size for smooth scaling
      const sizeLerpFactor = 0.15;
      sizeRef.current.width += (targetSizeRef.current.width - sizeRef.current.width) * sizeLerpFactor;
      sizeRef.current.height += (targetSizeRef.current.height - sizeRef.current.height) * sizeLerpFactor;

      // Calculate perimeter for stroke-dasharray
      const perimeter = 2 * (sizeRef.current.width + sizeRef.current.height);

      // Update positions (centered on the current size)
      const newX = centerPos.x - sizeRef.current.width / 2 + driftPosRef.current.x;
      const newY = centerPos.y - sizeRef.current.height / 2 + driftPosRef.current.y;
      
      rectangleRef.current.setAttribute('x', newX);
      rectangleRef.current.setAttribute('y', newY);
      rectangleRef.current.setAttribute('width', sizeRef.current.width);
      rectangleRef.current.setAttribute('height', sizeRef.current.height);
      rectangleRef.current.style.strokeDasharray = perimeter;
      
      cutoutRef.current.setAttribute('x', newX);
      cutoutRef.current.setAttribute('y', newY);
      cutoutRef.current.setAttribute('width', sizeRef.current.width);
      cutoutRef.current.setAttribute('height', sizeRef.current.height);

      // Update cutout hit target position and size (follows drift and current size)
      if (cutoutHitRef.current) {
        // Hit target should be slightly larger than the visual cutout for easier interaction
        const hitPadding = 40;
        const hitWidth = sizeRef.current.width + hitPadding * 2;
        const hitHeight = sizeRef.current.height + hitPadding * 2;
        cutoutHitRef.current.setAttribute('x', centerPos.x - hitWidth / 2 + driftPosRef.current.x);
        cutoutHitRef.current.setAttribute('y', centerPos.y - hitHeight / 2 + driftPosRef.current.y);
        cutoutHitRef.current.setAttribute('width', hitWidth);
        cutoutHitRef.current.setAttribute('height', hitHeight);
      }

      // Update bezier mask rect to match cutout
      if (bezierMaskRectRef.current) {
        bezierMaskRectRef.current.setAttribute('x', newX);
        bezierMaskRectRef.current.setAttribute('y', newY);
        bezierMaskRectRef.current.setAttribute('width', sizeRef.current.width);
        bezierMaskRectRef.current.setAttribute('height', sizeRef.current.height);
      }

      // Update corner brackets
      if (cornersRef.current) {
        updateCornerBrackets(newX, newY, sizeRef.current.width, sizeRef.current.height);
      }

      // Update "start here" text and hit target position
      if (startHereRef.current) {
        startHereRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x);
        startHereRef.current.setAttribute('y', newY - 10);
      }
      if (startHereHitRef.current) {
        startHereHitRef.current.setAttribute('x', centerPos.x + driftPosRef.current.x - 50);
        startHereHitRef.current.setAttribute('y', newY - 28);
      }

      // Update cursor-to-text line endpoint - find closest point on text bounds
      if (cursorToTextLineRef.current) {
        // Text bounding box (approximate)
        const textCenterX = centerPos.x + driftPosRef.current.x;
        const textCenterY = newY - 16; // Center of the text
        const textHalfWidth = 42; // Half of text width (~84px for "start here")
        const textHalfHeight = 8; // Half of text height
        
        // Text bounds
        const textLeft = textCenterX - textHalfWidth;
        const textRight = textCenterX + textHalfWidth;
        const textTop = textCenterY - textHalfHeight;
        const textBottom = textCenterY + textHalfHeight;
        
        // Cursor position
        const cx = cursorPosRef.current.x;
        const cy = cursorPosRef.current.y;
        
        // Find closest point on rectangle to cursor
        const closestX = Math.max(textLeft, Math.min(cx, textRight));
        const closestY = Math.max(textTop, Math.min(cy, textBottom));
        
        cursorToTextLineRef.current.setAttribute('x2', closestX);
        cursorToTextLineRef.current.setAttribute('y2', closestY);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDrawn, centerPos, isDismissed]);

  // Function to update corner bracket positions
  const updateCornerBrackets = (x, y, width, height) => {
    // Cache corner elements on first call
    if (cornerElementsRef.current.length === 0 && cornersRef.current) {
      cornerElementsRef.current = Array.from(cornersRef.current.querySelectorAll('.corner-bracket'));
    }
    
    const corners = cornerElementsRef.current;
    if (corners.length !== 4) return;

    const offset = cornerOffset;
    const hLen = cornerHorizontalLength;
    const vLen = cornerVerticalLength;

    // Top-left corner
    corners[0].setAttribute('d', `
      M ${x - offset + hLen} ${y - offset}
      L ${x - offset} ${y - offset}
      L ${x - offset} ${y - offset + vLen}
    `);

    // Top-right corner
    corners[1].setAttribute('d', `
      M ${x + width + offset - hLen} ${y - offset}
      L ${x + width + offset} ${y - offset}
      L ${x + width + offset} ${y - offset + vLen}
    `);

    // Bottom-right corner
    corners[2].setAttribute('d', `
      M ${x + width + offset} ${y + height + offset - vLen}
      L ${x + width + offset} ${y + height + offset}
      L ${x + width + offset - hLen} ${y + height + offset}
    `);

    // Bottom-left corner
    corners[3].setAttribute('d', `
      M ${x - offset + hLen} ${y + height + offset}
      L ${x - offset} ${y + height + offset}
      L ${x - offset} ${y + height + offset - vLen}
    `);
  };

  // Bezier point hover handlers
  const handlePointHover = useCallback((pointId, handleType) => {
    setHoveredPoint({ pointId, handleType });
  }, []);

  const handlePointLeave = useCallback(() => {
    setHoveredPoint({ pointId: null, handleType: null });
  }, []);

  // Bezier point drag handlers - supports both mouse and touch
  const handlePointMouseDown = useCallback((e, pointId, handleType = null) => {
    e.stopPropagation();
    e.preventDefault();
    
    const point = bezierPoints.find(p => p.id === pointId);
    if (!point) return;
    
    // Get client coordinates from mouse or touch event
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    let startX, startY;
    if (handleType === 'h1') {
      startX = point.h1x;
      startY = point.h1y;
    } else if (handleType === 'h2') {
      startX = point.h2x;
      startY = point.h2y;
    } else {
      startX = point.x;
      startY = point.y;
    }
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      pointX: startX,
      pointY: startY,
      // Store original handle positions for main point drag
      h1x: point.h1x,
      h1y: point.h1y,
      h2x: point.h2x,
      h2y: point.h2y,
    };
    
    setDragState({ isDragging: true, pointId, handleType });
  }, [bezierPoints]);

  useEffect(() => {
    if (!dragState.isDragging) return;
    
    const handleMove = (clientX, clientY) => {
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      
      // Only mark as dragging if we've actually moved
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        wasDraggingRef.current = true;
      }
      
      setBezierPoints(prev => prev.map(p => {
        if (p.id !== dragState.pointId) return p;
        
        if (dragState.handleType === 'h1') {
          // Dragging handle 1 - mirror to handle 2 (fixed angle, fixed distance)
          const newH1x = dragStartRef.current.pointX + dx;
          const newH1y = dragStartRef.current.pointY + dy;
          
          // Calculate distance from current anchor to new handle position
          const handleDx = newH1x - p.x;
          const handleDy = newH1y - p.y;
          
          // Mirror handle 2 to opposite side at same distance
          return {
            ...p,
            h1x: newH1x,
            h1y: newH1y,
            h2x: p.x - handleDx,
            h2y: p.y - handleDy,
            // Update base positions so drift continues from new position
            baseH1x: newH1x,
            baseH1y: newH1y,
            baseH2x: p.x - handleDx,
            baseH2y: p.y - handleDy,
          };
        } else if (dragState.handleType === 'h2') {
          // Dragging handle 2 - mirror to handle 1 (fixed angle, fixed distance)
          const newH2x = dragStartRef.current.pointX + dx;
          const newH2y = dragStartRef.current.pointY + dy;
          
          // Calculate distance from current anchor to new handle position
          const handleDx = newH2x - p.x;
          const handleDy = newH2y - p.y;
          
          // Mirror handle 1 to opposite side at same distance
          return {
            ...p,
            h2x: newH2x,
            h2y: newH2y,
            h1x: p.x - handleDx,
            h1y: p.y - handleDy,
            // Update base positions so drift continues from new position
            baseH2x: newH2x,
            baseH2y: newH2y,
            baseH1x: p.x - handleDx,
            baseH1y: p.y - handleDy,
          };
        } else {
          // Dragging main anchor point - move handles with it
          const newX = dragStartRef.current.pointX + dx;
          const newY = dragStartRef.current.pointY + dy;
          const newH1x = dragStartRef.current.h1x + dx;
          const newH1y = dragStartRef.current.h1y + dy;
          const newH2x = dragStartRef.current.h2x + dx;
          const newH2y = dragStartRef.current.h2y + dy;
          
          return {
            ...p,
            x: newX,
            y: newY,
            h1x: newH1x,
            h1y: newH1y,
            h2x: newH2x,
            h2y: newH2y,
            // Update base positions so drift continues from new position
            baseX: newX,
            baseY: newY,
            baseH1x: newH1x,
            baseH1y: newH1y,
            baseH2x: newH2x,
            baseH2y: newH2y,
          };
        }
      }));
    };
    
    const handleMouseMove = (e) => {
      handleMove(e.clientX, e.clientY);
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    
    const handleEnd = () => {
      setDragState({ isDragging: false, pointId: null, handleType: null });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [dragState.isDragging, dragState.pointId, dragState.handleType]);

  // Generate bezier path string connecting all points (closed loop)
  const generateBezierPath = useCallback(() => {
    if (bezierPoints.length < 2) return '';
    
    let path = `M ${bezierPoints[0].x} ${bezierPoints[0].y}`;
    
    for (let i = 0; i < bezierPoints.length - 1; i++) {
      const current = bezierPoints[i];
      const next = bezierPoints[i + 1];
      
      // Cubic bezier: current point -> current's h2 -> next's h1 -> next point
      path += ` C ${current.h2x} ${current.h2y}, ${next.h1x} ${next.h1y}, ${next.x} ${next.y}`;
    }
    
    // Close the loop: connect last point back to first point
    const last = bezierPoints[bezierPoints.length - 1];
    const first = bezierPoints[0];
    path += ` C ${last.h2x} ${last.h2y}, ${first.h1x} ${first.h1y}, ${first.x} ${first.y}`;
    
    return path;
  }, [bezierPoints]);

  return (
    <div 
      ref={overlayRef}
      className="landing-overlay"
    >
      <svg className="landing-svg" onClick={handleOverlayClick}>
        <defs>
          <mask id="cutoutMask">
            {/* Background matching Three.js */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rectangle creates the cutout */}
            <rect
              ref={cutoutRef}
              className="cutout-rectangle"
              x={centerPos.x - 100 + driftPosRef.current.x}
              y={centerPos.y - 75 + driftPosRef.current.y}
              width="200"
              height="150"
              fill="black"
              style={{ opacity: 0, transition: 'opacity 0.2s ease-in' }}
            />
          </mask>
          {/* Mask for bezier system to hide elements inside cutout */}
          <mask id="bezierMask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              ref={bezierMaskRectRef}
              x={centerPos.x - 100 + driftPosRef.current.x}
              y={centerPos.y - 75 + driftPosRef.current.y}
              width="200"
              height="150"
              fill="black"
            />
          </mask>
        </defs>
        
        {/* Overlay with cutout mask */}
        <rect 
          width="100%" 
          height="100%" 
          fill={bgColor} 
          mask="url(#cutoutMask)"
        />
        
        {/* Landing text - masked by cutout */}
        <foreignObject 
          x={0} 
          y={0} 
          width="100%" 
          height="100%" 
          mask="url(#cutoutMask)"
          style={{ pointerEvents: 'none' }}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              padding: '24px',
              maxWidth: '600px',
              fontFamily: "'Inter Bold', Inter, sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? '33px' : '48px',
              lineHeight: 1.1,
              color: strokeColor,
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            Henry Allan is building design systems in 2D, 3D, and code
          </div>
        </foreignObject>
        
        {/* Invisible hit target for cutout - large enough to cover expanded state */}
        <rect
          ref={cutoutHitRef}
          x={centerPos.x - 140 + driftPosRef.current.x}
          y={centerPos.y - 105 + driftPosRef.current.y}
          width="280"
          height="210"
          fill="transparent"
          onClick={handleClick}
          onTouchEnd={(e) => {
            // Prevent double-firing with click and handle touch directly
            if (!wasDraggingRef.current && isDrawn) {
              e.preventDefault();
              handleClick(e);
            }
          }}
          onMouseEnter={() => {
            if (isDrawn && !isAnimatingRef.current) setIsHoveredDebounced(true);
          }}
          onMouseLeave={() => {
            if (!isAnimatingRef.current) setIsHoveredDebounced(false);
          }}
          style={{
            cursor: isDrawn ? 'pointer' : 'default',
            pointerEvents: isDismissed === true ? 'none' : 'all'
          }}
        />
        
        {/* Visible rectangle stroke - clickable cutout */}
        <rect
          ref={rectangleRef}
          className="rectangle-stroke"
          x={centerPos.x - 100 + driftPosRef.current.x}
          y={centerPos.y - 75 + driftPosRef.current.y}
          width="200"
          height="150"
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
          style={{
            pointerEvents: 'none'
          }}
        />

        {/* Line from cursor to above "Start Here" text - desktop only */}
        {!isMobile && (
          <line
            ref={cursorToTextLineRef}
            x1={mousePosRef.current.x}
            y1={mousePosRef.current.y}
            x2={centerPos.x + driftPosRef.current.x}
            y2={centerPos.y - 75 + driftPosRef.current.y - 22}
            stroke="#1ddd1dff"
            strokeWidth="0.5"
            strokeOpacity={0.5 * bezierDrawProgress}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Invisible hit target for "Start Here" text - extends down to cutout */}
        <rect
          ref={startHereHitRef}
          className="start-here-hit"
          x={centerPos.x + driftPosRef.current.x - 50}
          y={centerPos.y - 75 + driftPosRef.current.y - 28}
          width="100"
          height="30"
          fill="transparent"
          onClick={handleClick}
          onTouchEnd={(e) => {
            // Prevent double-firing with click and handle touch directly
            if (!wasDraggingRef.current && isDrawn) {
              e.preventDefault();
              handleClick(e);
            }
          }}
          onMouseEnter={() => isDrawn && !isAnimatingRef.current && setIsHovered(true)}
          onMouseLeave={() => !isAnimatingRef.current && setIsHovered(false)}
          style={{ 
            pointerEvents: isDismissed === true ? 'none' : (bezierDrawProgress >= 1 ? 'all' : 'none'),
            cursor: isDrawn ? 'pointer' : 'default'
          }}
        />

        {/* "Start Here" text above cutout */}
        <text
          ref={startHereRef}
          x={centerPos.x + driftPosRef.current.x}
          y={centerPos.y - 75 + driftPosRef.current.y - 10}
          textAnchor="middle"
          fontFamily="'IBM Plex Mono', monospace"
          fontWeight="400"
          fontSize="12"
          fill={strokeColor}
          fillOpacity="0"
          style={{ pointerEvents: 'none' }}
        >
          start here
        </text>

        {/* Corner brackets around cutout */}
        <g ref={cornersRef}>
          <path
            className="corner-bracket"
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Screen corner brackets */}
        <g className="screen-corners" mask="url(#cutoutMask)">
          {/* Top-left */}
          <path
            d={`M ${screenCornerInset} ${screenCornerInset + screenCornerLength} L ${screenCornerInset} ${screenCornerInset} L ${screenCornerInset + screenCornerLength} ${screenCornerInset}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {/* Top-right */}
          <path
            d={`M ${windowSize.width - screenCornerInset - screenCornerLength} ${screenCornerInset} L ${windowSize.width - screenCornerInset} ${screenCornerInset} L ${windowSize.width - screenCornerInset} ${screenCornerInset + screenCornerLength}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {/* Bottom-right */}
          <path
            d={`M ${windowSize.width - screenCornerInset} ${windowSize.height - screenCornerInset - screenCornerLength} L ${windowSize.width - screenCornerInset} ${windowSize.height - screenCornerInset} L ${windowSize.width - screenCornerInset - screenCornerLength} ${windowSize.height - screenCornerInset}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {/* Bottom-left */}
          <path
            d={`M ${screenCornerInset + screenCornerLength} ${windowSize.height - screenCornerInset} L ${screenCornerInset} ${windowSize.height - screenCornerInset} L ${screenCornerInset} ${windowSize.height - screenCornerInset - screenCornerLength}`}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Interactive Bezier Path System */}
        <g ref={bezierSystemRef} className="bezier-system" mask="url(#bezierMask)">
          {/* Lines from cursor to each anchor point - desktop only, distance-based visibility */}
          {!isMobile && bezierPoints.map((point) => {
            const dx = mousePosRef.current.x - point.x;
            const dy = mousePosRef.current.y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 300; // Distance threshold in pixels
            const opacity = distance < maxDistance 
              ? (1 - distance / maxDistance) * 0.25 * bezierDrawProgress 
              : 0;
            
            return (
              <line
                key={`cursor-line-${point.id}`}
                className="cursor-to-bezier-line"
                x1={mousePosRef.current.x}
                y1={mousePosRef.current.y}
                x2={point.x}
                y2={point.y}
                stroke={strokeColor}
                strokeWidth="0.5"
                strokeOpacity={opacity}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
          
          {/* The main bezier curve path */}
          <path
            ref={bezierPathRef}
            d={generateBezierPath()}
            fill="white"
            fillOpacity={0.03 * bezierDrawProgress}
            stroke={strokeColor}
            strokeWidth="0.5"
            strokeDasharray="4 4"
            strokeOpacity={0.5 * bezierDrawProgress}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
          
          {/* Handle lines and control points for each anchor */}
          {bezierPoints.map((point, index) => (
            <g key={point.id} className="bezier-point-group">
              {/* Handle lines */}
              <line
                x1={point.x}
                y1={point.y}
                x2={point.x + (point.h1x - point.x) * bezierDrawProgress}
                y2={point.y + (point.h1y - point.y) * bezierDrawProgress}
                stroke={strokeColor}
                strokeWidth="0.5"
                strokeOpacity={0.5 * bezierDrawProgress}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              <line
                x1={point.x}
                y1={point.y}
                x2={point.x + (point.h2x - point.x) * bezierDrawProgress}
                y2={point.y + (point.h2y - point.y) * bezierDrawProgress}
                stroke={strokeColor}
                strokeWidth="0.5"
                strokeOpacity={0.5 * bezierDrawProgress}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              
              {/* Handle 1 control point */}
              {/* Invisible larger hit target */}
              <circle
                cx={point.h1x}
                cy={point.h1y}
                r={15}
                fill={strokeColor}
                fillOpacity={hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'h1' ? 0.08 : 0}
                style={{ cursor: 'grab', pointerEvents: isDismissed === true ? 'none' : (bezierDrawProgress > 0.5 ? 'all' : 'none'), touchAction: 'none' }}
                onMouseDown={(e) => handlePointMouseDown(e, point.id, 'h1')}
                onTouchStart={(e) => handlePointMouseDown(e, point.id, 'h1')}
                onMouseEnter={() => handlePointHover(point.id, 'h1')}
                onMouseLeave={handlePointLeave}
              />
              {/* Visible circle */}
              <circle
                cx={point.h1x}
                cy={point.h1y}
                r={(hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'h1' ? 6 : 4) * bezierDrawProgress}
                fill={strokeColor}
                fillOpacity={0.15 * bezierDrawProgress}
                stroke={strokeColor}
                strokeWidth="1"
                strokeOpacity={0.5 * bezierDrawProgress}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              
              {/* Handle 2 control point */}
              {/* Invisible larger hit target */}
              <circle
                cx={point.h2x}
                cy={point.h2y}
                r={15}
                fill={strokeColor}
                fillOpacity={hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'h2' ? 0.08 : 0}
                style={{ cursor: 'grab', pointerEvents: isDismissed === true ? 'none' : (bezierDrawProgress > 0.5 ? 'all' : 'none'), touchAction: 'none' }}
                onMouseDown={(e) => handlePointMouseDown(e, point.id, 'h2')}
                onTouchStart={(e) => handlePointMouseDown(e, point.id, 'h2')}
                onMouseEnter={() => handlePointHover(point.id, 'h2')}
                onMouseLeave={handlePointLeave}
              />
              {/* Visible circle */}
              <circle
                cx={point.h2x}
                cy={point.h2y}
                r={(hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'h2' ? 6 : 4) * bezierDrawProgress}
                fill={strokeColor}
                fillOpacity={0.15 * bezierDrawProgress}
                stroke={strokeColor}
                strokeWidth="1"
                strokeOpacity={0.5 * bezierDrawProgress}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              
              {/* Main anchor point */}
              {/* Invisible larger hit target */}
              <circle
                cx={point.x}
                cy={point.y}
                r={18}
                fill={strokeColor}
                fillOpacity={hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'anchor' ? 0.08 : 0}
                style={{ cursor: 'grab', pointerEvents: isDismissed === true ? 'none' : (bezierDrawProgress > 0.5 ? 'all' : 'none'), touchAction: 'none' }}
                onMouseDown={(e) => handlePointMouseDown(e, point.id, null)}
                onTouchStart={(e) => handlePointMouseDown(e, point.id, null)}
                onMouseEnter={() => handlePointHover(point.id, 'anchor')}
                onMouseLeave={handlePointLeave}
              />
              {/* Visible circle */}
              <circle
                cx={point.x}
                cy={point.y}
                r={(hoveredPoint.pointId === point.id && hoveredPoint.handleType === 'anchor' ? 7 : 5) * bezierDrawProgress}
                fill={strokeColor}
                fillOpacity={0.15 * bezierDrawProgress}
                stroke={strokeColor}
                strokeWidth="1"
                strokeOpacity={0.5 * bezierDrawProgress}
                vectorEffect="non-scaling-stroke"
                style={{ pointerEvents: 'none' }}
              />
              {/* Letter label */}
              <text
                x={point.x + 10}
                y={point.y - 10}
                fontFamily="'IBM Plex Mono', monospace"
                fontWeight="400"
                fontSize="9"
                fill={strokeColor}
                fillOpacity={0.6 * bezierDrawProgress}
                style={{ pointerEvents: 'none' }}
              >
                {String.fromCharCode(65 + index)}
              </text>
            </g>
          ))}
        </g>

        {/* Shockwave circles */}
        {shockwaves.map(sw => (
          <circle
            key={sw.id}
            cx={sw.x}
            cy={sw.y}
            r={sw.radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.5"
            strokeOpacity={sw.opacity * 0.3}
            vectorEffect="non-scaling-stroke"
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* Coordinate display in bottom right corner */}
        <g style={{ pointerEvents: 'none' }}>
          {bezierPoints.map((point, index) => (
            <text
              key={`coord-${point.id}`}
              x={windowSize.width - 24}
              y={windowSize.height - 24 - (bezierPoints.length - 1 - index) * 16}
              textAnchor="end"
              fontFamily="'IBM Plex Mono', monospace"
              fontWeight="400"
              fontSize="10"
              fill={strokeColor}
              fillOpacity={0.5 * bezierDrawProgress}
            >
              {String.fromCharCode(65 + index)}: ({point.x.toFixed(4)}, {point.y.toFixed(4)})
            </text>
          ))}
        </g>
      </svg>
      
      {/* Bezier point count slider */}
      <div 
        className="bezier-slider-container"
        style={{ opacity: bezierDrawProgress }}
      >
        <span className="bezier-slider-label" style={{ color: strokeColor }}>{numBezierPoints}</span>
        <input
          type="range"
          min="3"
          max="20"
          value={numBezierPoints}
          onChange={(e) => setNumBezierPoints(parseInt(e.target.value, 10))}
          className="bezier-slider"
          style={{
            '--slider-color': strokeColor,
          }}
        />
      </div>
    </div>
  );
}

export default LandingOverlay;
