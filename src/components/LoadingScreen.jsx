import { useState, useEffect, useRef } from 'react';
import './LoadingScreen.css';

const DURATION = 3500; // 3.5 seconds

function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      // Ease-out curve so it slows down toward the end
      const eased = 1 - Math.pow(1 - t, 2);
      setProgress(Math.floor(eased * 100));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Count finished — start fade out
        setFadeOut(true);
        setTimeout(() => {
          onComplete?.();
        }, 400); // match CSS transition duration
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onComplete]);

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      <span className="loading-number">{progress}</span>
    </div>
  );
}

export default LoadingScreen;
