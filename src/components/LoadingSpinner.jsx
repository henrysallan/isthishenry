import './LoadingSpinner.css';

function LoadingSpinner({ size = 40 }) {
  const tickCount = 15;
  const ticks = Array.from({ length: tickCount }, (_, i) => i);
  const radius = 16; // Distance from center to tick
  const tickLength = 5;
  
  return (
    <div className="loading-spinner" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        {ticks.map((i) => {
          const angle = (i / tickCount) * 2 * Math.PI - Math.PI / 2; // Start from top
          const delay = (i / tickCount) * 0.8;
          
          // Calculate line positions
          const x1 = 20 + (radius - tickLength) * Math.cos(angle);
          const y1 = 20 + (radius - tickLength) * Math.sin(angle);
          const x2 = 20 + radius * Math.cos(angle);
          const y2 = 20 + radius * Math.sin(angle);
          
          return (
            <line
              key={i}
              className="spinner-tick"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{ animationDelay: `${delay}s` }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default LoadingSpinner;
