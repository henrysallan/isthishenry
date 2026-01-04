import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import './CustomCursor.css';

function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentRadius, setCurrentRadius] = useState(20);
  const [spinSpeed, setSpinSpeed] = useState(0.5); // Base spin speed
  const animationFrameRef = useRef(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(Date.now());
  const velocityRef = useRef(0);
  const isHoveringMenuItem = useNavigationStore(state => state.isHoveringMenuItem);
  const isHoveringLogo = useNavigationStore(state => state.isHoveringLogo);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      
      // Calculate velocity
      if (dt > 0) {
        const dx = e.clientX - lastPositionRef.current.x;
        const dy = e.clientY - lastPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / dt * 16; // Normalize to ~60fps
        
        // Smooth the velocity with lerp
        velocityRef.current += (velocity - velocityRef.current) * 0.3;
      }
      
      lastPositionRef.current = { x: e.clientX, y: e.clientY };
      lastTimeRef.current = now;
      
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
      
      // Check if hovering over an interactive HTML element or SVG
      const target = e.target;
      
      // Skip cursor detection for p5 canvas - we use isHoveringLogo from store instead
      const isP5Canvas = target.tagName === 'CANVAS' && target.closest('.p5-logo-container');
      
      const computedCursor = window.getComputedStyle(target).cursor;
      const isInteractive = !isP5Canvas && (
                           target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.closest('button') ||
                           target.closest('a') ||
                           computedCursor === 'pointer' ||
                           computedCursor === 'grab' ||
                           target.style.cursor === 'pointer' ||
                           target.style.cursor === 'grab' ||
                           (target.tagName === 'rect' && target.classList.contains('rectangle-stroke')));
      setIsHovering(isInteractive || isHoveringMenuItem || isHoveringLogo);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    // Touch event handlers for mobile
    const handleTouchStart = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setPosition({ x: touch.clientX, y: touch.clientY });
        setIsVisible(true);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setPosition({ x: touch.clientX, y: touch.clientY });
        if (!isVisible) setIsVisible(true);
      }
    };

    const handleTouchEnd = () => {
      // Hide cursor after a short delay when touch ends
      setTimeout(() => setIsVisible(false), 300);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isVisible, isHoveringMenuItem]);

  // Animation loop for rotation and radius lerping
  useEffect(() => {
    let currentRotation = rotation;
    let currentRad = currentRadius;
    let currentSpinSpeed = 0.5; // Base speed
    
    const animate = () => {
      // Decay velocity over time when not moving
      velocityRef.current *= 0.95;
      
      // Calculate target spin speed based on velocity
      // Base speed is 0.5, max speed is around 8 at high velocity
      const baseSpeed = 0.5;
      const velocityMultiplier = Math.min(velocityRef.current * 0.5, 7.5); // Cap the multiplier
      const targetSpinSpeed = baseSpeed + velocityMultiplier;
      
      // Smooth the spin speed transition
      currentSpinSpeed += (targetSpinSpeed - currentSpinSpeed) * 0.1;
      
      if (isHovering) {
        // Lerp rotation back to 0 (home orientation)
        currentRotation += (0 - currentRotation) * 0.15; // Fast lerp
        
        // Lerp radius from 20 to 13
        currentRad += (13 - currentRad) * 0.15;
      } else {
        // Continuous spin with velocity-based speed
        currentRotation += currentSpinSpeed;
        if (currentRotation >= 360) currentRotation -= 360;
        
        // Lerp radius back to 20
        currentRad += (20 - currentRad) * 0.15;
      }
      
      setRotation(currentRotation);
      setCurrentRadius(currentRad);
      setSpinSpeed(currentSpinSpeed);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovering]); // Re-run when hover state changes

  const radius = currentRadius; // Distance from center to tick marks (animated)
  const tickLength = 6; // Length of each tick mark
  const arcRadius = 10; // Radius of the arcs
  const arcGap = 25; // Gap in degrees on each side of the tick marks

  // Calculate tick mark positions (top, right, bottom, left)
  const ticks = [
    { angle: 0, label: 'top' },     // top
    { angle: 90, label: 'right' },  // right
    { angle: 180, label: 'bottom' }, // bottom
    { angle: 270, label: 'left' }   // left
  ];

  // Calculate arc paths (between the ticks)
  const arcs = [
    { start: 0 + arcGap, end: 90 - arcGap, quadrant: 'top-right' },     // Quadrant 1 (top-right)
    { start: 90 + arcGap, end: 180 - arcGap, quadrant: 'bottom-right' }, // Quadrant 2 (bottom-right)
    { start: 180 + arcGap, end: 270 - arcGap, quadrant: 'bottom-left' }, // Quadrant 3 (bottom-left)
    { start: 270 + arcGap, end: 360 - arcGap, quadrant: 'top-left' }    // Quadrant 4 (top-left)
  ];

  // Convert polar to cartesian coordinates
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Create SVG arc path
  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  const size = (radius + tickLength) * 2 + 10; // SVG viewBox size
  const center = size / 2;

  return (
    <div
      className={`custom-cursor ${isVisible ? 'visible' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        mixBlendMode: 'difference'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'none'
        }}
      >
        {/* Tick marks */}
        {ticks.map((tick, index) => {
          const angleRad = (tick.angle * Math.PI) / 180;
          const innerX = center + (radius - tickLength) * Math.cos(angleRad);
          const innerY = center + (radius - tickLength) * Math.sin(angleRad);
          const outerX = center + radius * Math.cos(angleRad);
          const outerY = center + radius * Math.sin(angleRad);

          return (
            <line
              key={`tick-${index}`}
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke="#ffffff"
              strokeWidth="1"
              strokeLinecap="round"
            />
          );
        })}

        {/* Arcs in quadrants */}
        {arcs.map((arc, index) => (
          <path
            key={`arc-${index}`}
            d={describeArc(center, center, arcRadius, arc.start, arc.end)}
            stroke="#ffffff"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={1}
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

export default CustomCursor;
