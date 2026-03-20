import { useEffect, useRef, useCallback, useState } from 'react';
import gsap from 'gsap';
import './CyclingText.css';

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function CyclingText({ prefix, suffixes, className = '', interval = 4000 }) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const periodRef = useRef(null);
  const currentIndexRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const mountedRef = useRef(true);
  const cycleRef = useRef(null);
  const initialDelay = useRef(Math.random() * 1500);
  const [minHeight, setMinHeight] = useState(0);

  // Build word <span>s in the container; return array of word spans
  const buildWords = useCallback((text) => {
    const container = containerRef.current;
    if (!container) return [];

    while (container.firstChild) container.removeChild(container.firstChild);

    const words = text.split(' ');
    const spans = [];

    words.forEach((word, i) => {
      const span = document.createElement('span');
      span.className = 'cycling-word';
      span.textContent = word;
      container.appendChild(span);
      spans.push(span);

      if (i < words.length - 1) {
        container.appendChild(document.createTextNode(' '));
      }
    });

    return spans;
  }, []);

  // Pick random next index ≠ current
  const getNextIndex = useCallback(() => {
    const cur = currentIndexRef.current;
    if (suffixes.length <= 1) return 0;
    let next;
    do {
      next = Math.floor(Math.random() * suffixes.length);
    } while (next === cur);
    return next;
  }, [suffixes.length]);

  // Main animation cycle
  const cycle = useCallback(async () => {
    if (isAnimatingRef.current || !mountedRef.current) return;
    isAnimatingRef.current = true;

    const container = containerRef.current;
    const periodEl = periodRef.current;
    if (!container || !periodEl) {
      isAnimatingRef.current = false;
      return;
    }

    try {
      // --- Phase 1: fade out old words in random order ---
      const oldWords = Array.from(container.querySelectorAll('.cycling-word'));
      const shuffledOld = shuffle(oldWords);
      const staggerOut = Math.min(0.07, 0.35 / Math.max(shuffledOld.length, 1));

      const tl1 = gsap.timeline();
      shuffledOld.forEach((el, i) => {
        tl1.to(el, { opacity: 0, duration: 0.18, ease: 'power2.in' }, i * staggerOut);
      });
      await tl1;

      if (!mountedRef.current) return;
      await wait(200);
      if (!mountedRef.current) return;

      // --- Phase 2: FLIP the period to its new position ---
      // Record old period position
      const firstRect = periodEl.getBoundingClientRect();

      // Pick next suffix
      const nextIdx = getNextIndex();
      currentIndexRef.current = nextIdx;

      // Swap content – new words start invisible
      const newSpans = buildWords(suffixes[nextIdx]);
      newSpans.forEach((s) => {
        s.style.opacity = '0';
      });

      // Force reflow so getBoundingClientRect returns the updated position
      container.getBoundingClientRect();
      const lastRect = periodEl.getBoundingClientRect();

      // Invert + Play
      const dx = firstRect.left - lastRect.left;
      const dy = firstRect.top - lastRect.top;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        gsap.set(periodEl, { x: dx, y: dy });
        await gsap.to(periodEl, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'power2.inOut',
        });
      }

      if (!mountedRef.current) return;
      await wait(150);
      if (!mountedRef.current) return;

      // --- Phase 3: fade in new words in random order ---
      const shuffledNew = shuffle([...newSpans]);
      const staggerIn = Math.min(0.07, 0.35 / Math.max(shuffledNew.length, 1));

      const tl2 = gsap.timeline();
      shuffledNew.forEach((el, i) => {
        tl2.to(el, { opacity: 1, duration: 0.18, ease: 'power2.out' }, i * staggerIn);
      });
      await tl2;
    } finally {
      isAnimatingRef.current = false;
    }
  }, [suffixes, buildWords, getNextIndex]);

  // Keep ref in sync so the timer always calls the latest version
  cycleRef.current = cycle;

  // Measure the tallest suffix to lock min-height so layout below doesn't shift
  const measureMinHeight = useCallback(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;

    // Temporarily remove min-height so measurements are natural
    wrapper.style.minHeight = '0px';

    let tallest = 0;
    suffixes.forEach((text) => {
      // Temporarily set content to each suffix
      while (container.firstChild) container.removeChild(container.firstChild);
      const words = text.split(' ');
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'cycling-word';
        span.textContent = word;
        container.appendChild(span);
        if (i < words.length - 1) {
          container.appendChild(document.createTextNode(' '));
        }
      });
      // Force reflow and measure
      const h = wrapper.getBoundingClientRect().height;
      if (h > tallest) tallest = h;
    });

    setMinHeight(tallest);

    // Restore first suffix
    buildWords(suffixes[currentIndexRef.current]);
  }, [suffixes, buildWords]);

  // Build initial text on mount & measure
  useEffect(() => {
    buildWords(suffixes[0]);
    // Defer measurement to after first paint so fonts are loaded
    requestAnimationFrame(() => measureMinHeight());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate on resize so it stays responsive
  useEffect(() => {
    const handleResize = () => measureMinHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [measureMinHeight]);

  // Mounted tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Timer loop – uses setTimeout so each cycle waits for the animation to finish
  useEffect(() => {
    let tid;
    let active = true;

    const next = (ms) => {
      tid = setTimeout(async () => {
        if (!active) return;
        await cycleRef.current?.();
        if (active) next(interval);
      }, ms);
    };

    next(interval + initialDelay.current);

    return () => {
      active = false;
      clearTimeout(tid);
    };
  }, [interval]);

  return (
    <div className="cycling-text-wrapper" style={minHeight ? { minHeight } : undefined}>
      <p ref={wrapperRef} className={className}>
        {prefix}
        <span ref={containerRef} className="cycling-text-container" />
        <span ref={periodRef} className="cycling-period">.</span>
      </p>
    </div>
  );
}

export default CyclingText;
