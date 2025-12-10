import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import './CustomCursor.css';

function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [currentRadius, setCurrentRadius] = useState(20);
  const animationFrameRef = useRef(null);
  const isHoveringMenuItem = useNavigationStore(state => state.isHoveringMenuItem);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
      
      // Check if hovering over an interactive HTML element or SVG
      const target = e.target;
      const computedCursor = window.getComputedStyle(target).cursor;
      const isInteractive = target.tagName === 'BUTTON' || 
                           target.tagName === 'A' || 
                           target.closest('button') ||
                           target.closest('a') ||
                           computedCursor === 'pointer' ||
                           target.style.cursor === 'pointer' ||
                           (target.tagName === 'rect' && target.classList.contains('rectangle-stroke'));
      setIsHovering(isInteractive || isHoveringMenuItem);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isVisible, isHoveringMenuItem]);

  // Animation loop for rotation and radius lerping
  useEffect(() => {
    let currentRotation = rotation;
    let currentRad = currentRadius;
    
    const animate = () => {
      if (isHovering) {
        // Lerp rotation back to 0 (home orientation)
        currentRotation += (0 - currentRotation) * 0.15; // Fast lerp
        
        // Lerp radius from 20 to 13
        currentRad += (13 - currentRad) * 0.15;
      } else {
        // Continuous slow spin
        currentRotation += 0.5; // degrees per frame
        if (currentRotation >= 360) currentRotation -= 360;
        
        // Lerp radius back to 20
        currentRad += (20 - currentRad) * 0.15;
      }
      
      setRotation(currentRotation);
      setCurrentRadius(currentRad);
      
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
        top: `${position.y}px`
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
              stroke="#666666"
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
            stroke="#666666"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}

export default CustomCursor;
