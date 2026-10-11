// React render probe. Paste into the DevTools console on a running page
// (or run it through a browser automation tool); resolves with a summary.
//
// For `seconds`, it counts:
//   - React commits, and which components rendered in them. Names are only
//     readable on the dev server; production builds minify them.
//   - frames, and time spent inside requestAnimationFrame callbacks (the
//     canvas/SVG/cursor animation loops). React's own commit work runs after
//     those callbacks, so it isn't included in rafMsPerSec.
//
// It hooks the live React root, so no build changes are needed. Everything
// is restored afterwards.
(async (seconds = 10) => {
  const rootEl = document.getElementById('root');
  const key = Object.keys(rootEl).find((k) => k.startsWith('__reactContainer$'));
  const fiberRoot = rootEl[key].stateNode;

  const isComponent = (tag) => tag === 0 || tag === 1 || tag === 11 || tag === 14 || tag === 15;
  const nameOf = (f) => {
    let t = f.type;
    if (t && t.type) t = t.type;
    if (t && t.render) t = t.render;
    return (t && (t.displayName || t.name)) || 'Anonymous';
  };
  const renders = {};
  // Same approach as React DevTools: only descend into subtrees React
  // reconciled, and count components flagged PerformedWork (1).
  const walk = (next, prev) => {
    if (isComponent(next.tag) && (prev === null || (next.flags & 1))) {
      const n = nameOf(next);
      renders[n] = (renders[n] || 0) + 1;
    }
    if (prev !== null && next.child === prev.child) return;
    for (let c = next.child; c; c = c.sibling) walk(c, c.alternate);
  };

  let commits = 0;
  let current = fiberRoot.current;
  Object.defineProperty(fiberRoot, 'current', {
    configurable: true,
    enumerable: true,
    get: () => current,
    set: (v) => { current = v; commits++; walk(v, v.alternate); },
  });

  let rafMs = 0;
  let rafCalls = 0;
  const origRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = (cb) => origRAF.call(window, (ts) => {
    const t = performance.now();
    try { return cb(ts); } finally { rafMs += performance.now() - t; rafCalls++; }
  });

  const longTasks = [];
  const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration)));
  try { po.observe({ type: 'longtask' }); } catch { /* unsupported */ }

  let frames = 0;
  let running = true;
  const tick = () => { if (running) { frames++; origRAF(tick); } };
  origRAF(tick);

  const t0 = performance.now();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  running = false;
  const elapsed = (performance.now() - t0) / 1000;

  window.requestAnimationFrame = origRAF;
  po.disconnect();
  delete fiberRoot.current;
  fiberRoot.current = current;

  const perSec = (n) => +(n / elapsed).toFixed(1);
  return {
    path: location.pathname,
    visibility: document.visibilityState,
    viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}x`,
    fps: perSec(frames),
    commitsPerSec: perSec(commits),
    commitsPerFrame: +(commits / Math.max(frames, 1)).toFixed(2),
    rafCallbacksPerFrame: +(rafCalls / Math.max(frames, 1)).toFixed(1),
    rafMsPerSec: perSec(rafMs),
    longTasks: longTasks.length,
    rendersPerSec: Object.fromEntries(
      Object.entries(renders).map(([k, v]) => [k, perSec(v)]).sort((a, b) => b[1] - a[1]).slice(0, 12),
    ),
  };
})(10);
