import { useEffect, useState, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import './CustomCursor.css';

const MAX_RADIUS = 20; // Distance from center to tick marks at rest
const HOVER_RADIUS = 13; // ...and while hovering something clickable
const TICK_LENGTH = 6;
const ARC_RADIUS = 10;
const ARC_GAP = 25; // Gap in degrees on each side of the tick marks
const BASE_SPIN = 0.5; // Degrees per frame when the pointer is still

// Fixed-size SVG sized for the largest radius; the container is centered on
// the pointer, so the drawing lines up the same at any radius.
const SIZE = (MAX_RADIUS + TICK_LENGTH) * 2 + 10;
const CENTER = SIZE / 2;
const TICK_ANGLES = [0, 90, 180, 270];

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
};

// Arcs in each quadrant, between the ticks
const ARC_PATHS = TICK_ANGLES.map(q => describeArc(CENTER, CENTER, ARC_RADIUS, q + ARC_GAP, q + 90 - ARC_GAP));

const tickCoords = (radius, angle) => {
  const a = (angle * Math.PI) / 180;
  return {
    x1: CENTER + (radius - TICK_LENGTH) * Math.cos(a),
    y1: CENTER + (radius - TICK_LENGTH) * Math.sin(a),
    x2: CENTER + radius * Math.cos(a),
    y2: CENTER + radius * Math.sin(a)
  };
};

// CustomCursor.css forces `cursor: none` everywhere, so only inline cursor
// styles and element types say whether something is clickable.
const isInteractiveTarget = (target) =>
  target.tagName === 'BUTTON' ||
  target.tagName === 'A' ||
  target.tagName === 'INPUT' ||
  !!target.closest?.('button, a') ||
  target.style?.cursor === 'pointer' ||
  target.style?.cursor === 'grab';

// Position, rotation and radius change every frame, so they're written
// straight to the DOM; React only re-renders when visibility or hover changes.
function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOverInteractive, setIsOverInteractive] = useState(false);
  const isHoveringMenuItem = useNavigationStore(state => state.isHoveringMenuItem);
  const isHovering = isOverInteractive || isHoveringMenuItem;

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const tickRefs = useRef([]);
  const isHoveringRef = useRef(isHovering);
  const anim = useRef({ rotation: 0, radius: MAX_RADIUS, drawnRadius: MAX_RADIUS, spinSpeed: BASE_SPIN, velocity: 0 });

  useEffect(() => {
    isHoveringRef.current = isHovering;
    anim.current.spinSpeed = BASE_SPIN;
  }, [isHovering]);

  useEffect(() => {
    let visible = false;
    let lastX = 0;
    let lastY = 0;
    let lastTime = performance.now();
    let lastTarget = null;
    let hideTimer = null;

    const moveTo = (x, y) => {
      containerRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    };
    const show = () => {
      clearTimeout(hideTimer);
      if (!visible) {
        visible = true;
        setIsVisible(true);
      }
    };
    const hide = () => {
      visible = false;
      setIsVisible(false);
    };

    const handleMouseMove = (e) => {
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        const distance = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        const velocity = (distance / dt) * 16; // Normalize to ~60fps
        anim.current.velocity += (velocity - anim.current.velocity) * 0.3;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;

      moveTo(e.clientX, e.clientY);
      show();
      if (e.target !== lastTarget) {
        lastTarget = e.target;
        setIsOverInteractive(isInteractiveTarget(e.target));
      }
    };

    const handleTouch = (e) => {
      if (e.touches.length > 0) {
        moveTo(e.touches[0].clientX, e.touches[0].clientY);
        show();
      }
    };
    // Hide cursor after a short delay when touch ends
    const handleTouchEnd = () => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 300);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', hide);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', hide);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Spin and radius animation; only runs while the cursor is visible
  useEffect(() => {
    if (!isVisible) return;
    let frame;

    const animate = () => {
      const a = anim.current;
      // Decay velocity over time when not moving
      a.velocity *= 0.95;
      // Base speed 0.5, up to ~8 at high pointer velocity
      const targetSpinSpeed = BASE_SPIN + Math.min(a.velocity * 0.5, 7.5);
      a.spinSpeed += (targetSpinSpeed - a.spinSpeed) * 0.1;

      if (isHoveringRef.current) {
        // Return to home orientation and shrink
        a.rotation += (0 - a.rotation) * 0.15;
        a.radius += (HOVER_RADIUS - a.radius) * 0.15;
      } else {
        a.rotation += a.spinSpeed;
        if (a.rotation >= 360) a.rotation -= 360;
        a.radius += (MAX_RADIUS - a.radius) * 0.15;
      }

      svgRef.current.style.transform = `rotate(${a.rotation}deg)`;
      if (Math.abs(a.radius - a.drawnRadius) > 0.01) {
        a.drawnRadius = a.radius;
        TICK_ANGLES.forEach((angle, i) => {
          const t = tickCoords(a.radius, angle);
          const line = tickRefs.current[i];
          line.setAttribute('x1', t.x1);
          line.setAttribute('y1', t.y1);
          line.setAttribute('x2', t.x2);
          line.setAttribute('y2', t.y2);
        });
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      className={`custom-cursor ${isVisible ? 'visible' : ''}`}
      style={{ mixBlendMode: 'difference' }}
    >
      <svg ref={svgRef} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} xmlns="http://www.w3.org/2000/svg">
        {TICK_ANGLES.map((angle, i) => (
          <line
            key={`tick-${angle}`}
            ref={el => { tickRefs.current[i] = el; }}
            {...tickCoords(MAX_RADIUS, angle)}
            stroke="#ffffff"
            strokeWidth="1"
            strokeLinecap="round"
          />
        ))}
        {ARC_PATHS.map((d, i) => (
          <path key={`arc-${i}`} d={d} stroke="#ffffff" strokeWidth="1" fill="none" strokeLinecap="round" />
        ))}
        <circle cx={CENTER} cy={CENTER} r={1} fill="#ffffff" />
      </svg>
    </div>
  );
}

export default CustomCursor;
