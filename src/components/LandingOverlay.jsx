import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './LandingOverlay.css';

function LandingOverlay({ onComplete }) {
  const overlayRef = useRef(null);
  const rectangleRef = useRef(null);
  const cutoutRef = useRef(null);
  const cornersRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDrawn, setIsDrawn] = useState(false);
  const [centerPos, setCenterPos] = useState({ x: 0, y: 0 });
  const cursorPosRef = useRef({ x: 0, y: 0 });
  const driftPosRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef({ width: 200, height: 150 });
  const targetSizeRef = useRef({ width: 200, height: 150 });
  const animationFrameRef = useRef(null);

  // Corner bracket dimensions
  const cornerOffset = 5; // Distance from rectangle edge
  const cornerHorizontalLength = 8; // Length of horizontal part
  const cornerVerticalLength = 8; // Length of vertical part

  useEffect(() => {
    // Calculate center position
    const updateCenter = () => {
      setCenterPos({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      });
    };
    
    updateCenter();
    window.addEventListener('resize', updateCenter);
    
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  useEffect(() => {
    // Wait for site to load behind, then draw the rectangle
    const drawTimer = setTimeout(() => {
      if (rectangleRef.current && cutoutRef.current) {
        // First animate the stroke drawing in
        gsap.to(rectangleRef.current, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: 'power2.inOut'
        });
        
        // Start the cutout opacity after 100ms
        setTimeout(() => {
          if (cutoutRef.current) {
            cutoutRef.current.style.opacity = '1';
          }
          setIsDrawn(true);
        }, 900);
      }
    }, 500); // Small delay before drawing starts

    return () => clearTimeout(drawTimer);
  }, []);

  // Handle hover scaling
  useEffect(() => {
    if (isHovered) {
      targetSizeRef.current = { width: 280, height: 210 };
    } else {
      targetSizeRef.current = { width: 200, height: 150 };
    }
  }, [isHovered]);

  // Handle cursor drift effect
  useEffect(() => {
    if (!isDrawn) return;

    const startTime = Date.now();
    const dampingDuration = 1000; // 100ms damping period

    const handleMouseMove = (e) => {
      cursorPosRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Smooth drift animation loop
    const animate = () => {
      if (!rectangleRef.current || !cutoutRef.current) return;

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

      // Update corner brackets
      if (cornersRef.current) {
        updateCornerBrackets(newX, newY, sizeRef.current.width, sizeRef.current.height);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDrawn, centerPos]);

  // Function to update corner bracket positions
  const updateCornerBrackets = (x, y, width, height) => {
    const corners = cornersRef.current.querySelectorAll('.corner-bracket');
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

  const handleClick = () => {
    if (!isDrawn) return;

    // Stop the animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const container = overlayRef.current;
    if (!container) return;

    // Animate the size expansion smoothly
    const expandSize = Math.max(window.innerWidth, window.innerHeight) * 2;
    
    gsap.to(targetSizeRef.current, {
      width: expandSize,
      height: expandSize,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (!rectangleRef.current || !cutoutRef.current) return;

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

        // Update corner brackets during expansion
        if (cornersRef.current) {
          updateCornerBrackets(newX, newY, targetSizeRef.current.width, targetSizeRef.current.height);
        }
      },
      onComplete: () => {
        // Fade out the overlay
        gsap.to(container, {
          opacity: 0,
          duration: 0.3,
          ease: 'power1.out',
          onComplete: () => {
            if (onComplete) onComplete();
          }
        });
      }
    });
  };

  return (
    <div 
      ref={overlayRef}
      className="landing-overlay"
      onClick={handleClick}
    >
      <svg className="landing-svg">
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
        </defs>
        
        {/* Overlay with cutout mask */}
        <rect 
          width="100%" 
          height="100%" 
          fill="#f3f3f3" 
          mask="url(#cutoutMask)"
        />
        
        {/* Visible rectangle stroke */}
        <rect
          ref={rectangleRef}
          className="rectangle-stroke"
          x={centerPos.x - 100 + driftPosRef.current.x}
          y={centerPos.y - 75 + driftPosRef.current.y}
          width="200"
          height="150"
          fill="none"
          stroke="black"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
          onMouseEnter={() => isDrawn && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            cursor: isDrawn ? 'pointer' : 'default',
            pointerEvents: 'all'
          }}
        />

        {/* Corner brackets */}
        <g ref={cornersRef}>
          <path
            className="corner-bracket"
            fill="none"
            stroke="black"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke="black"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke="black"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="corner-bracket"
            fill="none"
            stroke="black"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

export default LandingOverlay;
