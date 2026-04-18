import { useEffect, useRef, useCallback } from 'react';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes, theme } from '../config/theme';
import './P5Menu.css';

// ── Pure-math helpers (replace p5.bezierPoint / p5.bezierTangent) ──
function bezierPoint(a, b, c, d, t) {
  const t1 = 1 - t;
  return t1 * t1 * t1 * a + 3 * t1 * t1 * t * b + 3 * t1 * t * t * c + t * t * t * d;
}

function bezierTangent(a, b, c, d, t) {
  const t1 = 1 - t;
  return 3 * t1 * t1 * (b - a) + 6 * t1 * t * (c - b) + 3 * t * t * (d - c);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Color helpers ──
function withAlpha(hexOrColor, alpha) {
  // Accepts "#rrggbb" or "rgb(…)" or a plain color name
  // Returns an rgba string
  const a = Math.max(0, Math.min(1, alpha));
  // If already hex
  if (hexOrColor.startsWith('#')) {
    const r = parseInt(hexOrColor.slice(1, 3), 16);
    const g = parseInt(hexOrColor.slice(3, 5), 16);
    const b = parseInt(hexOrColor.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  // Fallback: let the browser deal with it via a tiny off-screen canvas
  return hexOrColor; // we'll refine in draw if needed
}

function P5Menu() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef(performance.now());

  // ── Animation state (persistent across frames) ──
  const animRef = useRef({
    mainItems: [],
    subItems: [],
    subAnimStartTime: 0,
    subAnimDirection: 0,
    prevExpandedSubmenuIdForAnim: null,
    backButton: { scale: 0, targetScale: 0, x: 0, y: 0, targetX: 0, targetY: 0 },
    submenuWireStartTime: 0,
    submenuWireDirection: 0,
    submenuWireVisible: false,
    submenuWireEndpoints: null,
    // Nested submenu (third level) items and wire
    nestedItems: [],
    nestedAnimStartTime: 0,
    nestedAnimDirection: 0,
    prevExpandedNestedIdForAnim: null,
    nestedWireStartTime: 0,
    nestedWireDirection: 0,
    nestedWireVisible: false,
    nestedWireEndpoints: null,
    prevExpandedNestedId: null,
    pageWireStartTime: 0,
    pageWireDirection: 0,
    pageWireVisible: false,
    pageWireEndpoints: null,
    cameraX: 0,
    targetCameraX: 0,
    dotPositions: [],
    dotBasePositions: [],
    prevExpandedSubmenuId: null,
    prevActiveMenuItem: null,
    prevCurrentView: null,
    pageWireItem: null,
    fontReady: false,
  });

  const isMobile = () => window.innerWidth <= 768;

  // ── Layout ──
  const getCanvasWidth = useCallback(() => {
    if (isMobile()) return window.innerWidth;
    return Math.floor(window.innerWidth * theme.layout.leftColumnRatio);
  }, []);

  const getCanvasHeight = useCallback(() => {
    if (isMobile()) return Math.floor(window.innerHeight * 0.35);
    return window.innerHeight;
  }, []);

  const getMenuX = useCallback(() => {
    const w = getCanvasWidth();
    if (isMobile()) return w / 2 - 30;
    return w / 2 - 40;
  }, [getCanvasWidth]);

  const getMenuPositionPx = useCallback((menuLevel, itemIndex, itemCount) => {
    const spacing = isMobile() ? 20 : 25;
    const totalHeight = (itemCount - 1) * spacing;
    const h = getCanvasHeight();
    const centerY = h / 2;
    const startY = centerY - totalHeight / 2;
    const depthSep = isMobile()
      ? theme.spatial.menuDepthSeparation * 25
      : theme.spatial.menuDepthSeparation * 50;

    let x;
    switch (menuLevel) {
      case 'submenu': x = getMenuX() + depthSep; break;
      case 'nested': x = getMenuX() + depthSep + (isMobile() ? 130 : 200); break;
      default: x = getMenuX();
    }
    return { x, y: startY + itemIndex * spacing };
  }, [getCanvasHeight, getMenuX]);

  // ── Dots ──
  const initDots = useCallback(() => {
    const anim = animRef.current;
    const gridCols = isMobile() ? 6 : 10;
    const gridRows = isMobile() ? 30 : 50;
    const spacingPx = isMobile() ? 20 : 40;
    anim.dotPositions = [];
    anim.dotBasePositions = [];
    for (let i = 0; i < gridCols; i++) {
      for (let j = 0; j < gridRows; j++) {
        const bx = i * spacingPx;
        const by = j * spacingPx;
        anim.dotBasePositions.push({ x: bx, y: by });
        anim.dotPositions.push({ x: bx, y: by });
      }
    }
  }, []);

  // ── Hit testing ──
  const isPointInRect = (px, py, rx, ry, rw, rh) =>
    px >= rx && px <= rx + rw && py >= ry - rh / 2 && py <= ry + rh / 2;

  // ── Setup ──
  const setup = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    // High-DPI sizing helper
    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = getCanvasWidth();
      const h = getCanvasHeight();
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    canvas._sizeCanvas = sizeCanvas;
    sizeCanvas();

    // Load font via FontFace API
    const anim = animRef.current;
    const fontFace = new FontFace('InterBold', 'url(/font/Inter_Bold.ttf)');
    fontFace.load().then((loaded) => {
      document.fonts.add(loaded);
      anim.fontReady = true;
    }).catch(() => {
      // Fallback to CSS Inter
      anim.fontReady = true;
    });

    // Init anim state for main menu
    const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
    anim.mainItems = [];
    for (let i = 0; i < mainMenu.length; i++) {
      const pos = getMenuPositionPx('main', i, mainMenu.length);
      anim.mainItems.push({
        x: pos.x, y: pos.y,
        targetX: pos.x, targetY: pos.y,
        opacity: 0.5, targetOpacity: 0.5,
      });
    }

    initDots();

    // Track whether the last input was touch (to suppress ghost mouse events)
    let lastInputWasTouch = false;

    // Mouse tracking
    const onMouseMove = (e) => {
      if (lastInputWasTouch) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas._onMouseMove = onMouseMove;

    // Click handling (mouse)
    const onMouseDown = (e) => {
      if (lastInputWasTouch) { lastInputWasTouch = false; return; }
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      handleClick(rawX, rawY);
    };
    canvas.addEventListener('mousedown', onMouseDown);
    canvas._onMouseDown = onMouseDown;

    // Touch handling
    const onTouchStart = (e) => {
      lastInputWasTouch = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const rawX = touch.clientX - rect.left;
      const rawY = touch.clientY - rect.top;
      mouseRef.current.x = rawX;
      mouseRef.current.y = rawY;
      handleClick(rawX, rawY);
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas._onTouchStart = onTouchStart;

    // Track touch movement for hover feedback
    const onTouchMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mouseRef.current.x = touch.clientX - rect.left;
      mouseRef.current.y = touch.clientY - rect.top;
    };
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas._onTouchMove = onTouchMove;

    // Reset mouse position on touch end so nothing stays hovered
    const onTouchEnd = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    canvas.addEventListener('touchend', onTouchEnd);
    canvas._onTouchEnd = onTouchEnd;

    // Resize
    const onResize = () => {
      canvas._sizeCanvas();
      initDots();
      const mm = navigationData.mainMenu.filter(m => !m.hidden);
      for (let i = 0; i < mm.length; i++) {
        if (anim.mainItems[i]) {
          const pos = getMenuPositionPx('main', i, mm.length);
          anim.mainItems[i].targetX = pos.x;
          anim.mainItems[i].targetY = pos.y;
        }
      }
    };
    window.addEventListener('resize', onResize);
    canvas._onResize = onResize;

  }, [getCanvasWidth, getCanvasHeight, getMenuPositionPx, getMenuX, initDots]);

  // ── Click handler ──
  const handleClick = useCallback((rawX, rawY) => {
    const anim = animRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const mx = rawX - anim.cameraX;
    const my = rawY;
    const fontSize = isMobile() ? 16 : 20;
    const hitHeight = isMobile() ? 40 : fontSize + 8;
    ctx.font = `bold ${fontSize}px InterBold, Inter, sans-serif`;

    const state = useNavigationStore.getState();
    const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
    const expandedParent = state.expandedSubmenuId
      ? mainMenu.find(m => m.id === state.expandedSubmenuId)
      : null;
    const submenuData = expandedParent?.submenu || [];
    const nestedParent = state.expandedNestedSubmenuId
      ? submenuData.find(s => s.id === state.expandedNestedSubmenuId)
      : null;
    const nestedData = nestedParent?.submenu || [];

    // Back button
    if (anim.backButton.scale > 0.3) {
      const backSize = isMobile() ? 48 : 36;
      if (isPointInRect(mx, my, anim.backButton.x - backSize / 2, anim.backButton.y, backSize, backSize)) {
        state.goBack();
        return;
      }
    }

    // Check nested items first (deepest level has priority)
    for (let i = 0; i < nestedData.length; i++) {
      if (i >= anim.nestedItems.length) break;
      const item = anim.nestedItems[i];
      if (item.opacity > 0.1) {
        const tw = ctx.measureText(nestedData[i].title).width;
        if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
          const nestedItem = nestedData[i];
          state.navigateToSubpage(nestedItem.id, state.expandedSubmenuId, state.expandedNestedSubmenuId);
          return;
        }
      }
    }

    // Main menu items
    for (let i = 0; i < mainMenu.length; i++) {
      const item = anim.mainItems[i];
      const tw = ctx.measureText(mainMenu[i].title).width;
      if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
        const menuItem = mainMenu[i];
        if (menuItem.type === 'submenu') {
          state.navigateToSubmenu(menuItem.id);
        } else if (menuItem.type === 'page') {
          if (state.expandedSubmenuId) {
            state.navigateToSubmenu(null);
            setTimeout(() => {
              useNavigationStore.getState().navigateToPage(menuItem.id, menuItem.id);
            }, theme.animation.duration * 1000);
          } else {
            state.navigateToPage(menuItem.id, menuItem.id);
          }
        }
        return;
      }
    }

    // Submenu items
    for (let i = 0; i < submenuData.length; i++) {
      if (i >= anim.subItems.length) break;
      const item = anim.subItems[i];
      if (item.opacity > 0.1) {
        const tw = ctx.measureText(submenuData[i].title).width;
        if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
          const subItem = submenuData[i];
          if (subItem.type === 'page') {
            state.navigateToSubpage(subItem.id, state.expandedSubmenuId);
          } else if (subItem.type === 'submenu') {
            state.navigateToNestedSubmenu(subItem.id);
          }
          return;
        }
      }
    }
  }, []);

  // ── Draw helpers ──
  const drawDots = useCallback((ctx, dotColor) => {
    const anim = animRef.current;
    const r = isMobile() ? 1.2 : 1.0;
    const half = r / 2;
    ctx.fillStyle = dotColor;
    for (let i = 0; i < anim.dotPositions.length; i++) {
      const dot = anim.dotPositions[i];
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, half, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const updateDots = useCallback(() => {
    const anim = animRef.current;
    const mouse = mouseRef.current;
    const hoverRadius = isMobile() ? 60 : 100;
    const hoverStrength = isMobile() ? 15 : 25;
    const lerpFactor = 0.08;

    for (let i = 0; i < anim.dotBasePositions.length; i++) {
      const base = anim.dotBasePositions[i];
      const dot = anim.dotPositions[i];
      const dx = base.x - mouse.x;
      const dy = base.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetX = base.x;
      let targetY = base.y;

      if (dist < hoverRadius && dist > 0.01) {
        const force = (1 - dist / hoverRadius) * hoverStrength;
        const angle = Math.atan2(dy, dx);
        targetX = base.x + Math.cos(angle) * force;
        targetY = base.y + Math.sin(angle) * force;
      }

      dot.x += (targetX - dot.x) * lerpFactor;
      dot.y += (targetY - dot.y) * lerpFactor;
    }
  }, []);

  const drawBezierWire = useCallback((ctx, x1, y1, x2, y2, progress, wireColor, wireOpacity, lineW) => {
    if (progress <= 0) return;
    const dx = x2 - x1;
    const cp1x = x1 + dx * 0.6;
    const cp1y = y1;
    const cp2x = x1 + dx * 0.4;
    const cp2y = y2;

    const steps = 40;
    const end = Math.floor(steps * Math.min(progress, 1));

    ctx.strokeStyle = withAlpha(wireColor, wireOpacity);
    ctx.lineWidth = lineW || 1;
    ctx.beginPath();
    for (let i = 0; i <= end; i++) {
      const t = i / steps;
      const px = bezierPoint(x1, cp1x, cp2x, x2, t);
      const py = bezierPoint(y1, cp1y, cp2y, y2, t);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }, []);

  const drawBackButton = useCallback((ctx, x, y, scale, col, hovered) => {
    if (scale < 0.01) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const opacity = hovered ? 1 : 0.59;
    ctx.strokeStyle = withAlpha(col, opacity);
    ctx.lineWidth = 1.5;
    const size = 7;
    // Diagonal line
    ctx.beginPath();
    ctx.moveTo(size, size);
    ctx.lineTo(-size, -size);
    ctx.stroke();
    // Arrowhead arms
    ctx.beginPath();
    ctx.moveTo(-size, size * 0.6);
    ctx.lineTo(-size, -size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.6, -size);
    ctx.lineTo(-size, -size);
    ctx.stroke();
    ctx.restore();
  }, []);

  // ── Main draw loop ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const anim = animRef.current;
    if (!canvas || !ctx || !anim.fontReady) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const mouse = mouseRef.current;
    const millis = performance.now() - startTimeRef.current;
    const W = getCanvasWidth();
    const H = getCanvasHeight();

    // Reset transform for clear, then re-apply DPR scale
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ── Read store ──
    const state = useNavigationStore.getState();
    const { currentView, activeMenuItem, expandedSubmenuId, expandedNestedSubmenuId, currentTheme, isThemeInverted } = state;
    const activeColors = colorThemes[currentTheme];

    const bgColor = isThemeInverted ? activeColors.text : activeColors.background;
    const textColor = isThemeInverted ? activeColors.background : activeColors.text;
    const wireColor = isThemeInverted ? activeColors.background : activeColors.wire;

    // ── Clear ──
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // ── Dots ──
    if (!isMobile()) {
      updateDots();
      drawDots(ctx, textColor);
    }

    // ── Font setup ──
    const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
    const fontSize = isMobile() ? 16 : 20;
    const hitHeight = isMobile() ? 40 : fontSize + 8;
    ctx.font = `bold ${fontSize}px InterBold, Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // ── Resolve submenu and nested data ──
    const expandedParent = expandedSubmenuId ? mainMenu.find(m => m.id === expandedSubmenuId) : null;
    const submenuData = expandedParent?.submenu || [];
    const nestedParent = expandedNestedSubmenuId
      ? submenuData.find(s => s.id === expandedNestedSubmenuId)
      : null;
    const nestedData = nestedParent?.submenu || [];

    // ── Camera offset ──
    if (expandedNestedSubmenuId && nestedData.length > 0) {
      // When nested is open, pan so both submenu and nested columns are visible
      const depthSep = isMobile()
        ? theme.spatial.menuDepthSeparation * 25
        : theme.spatial.menuDepthSeparation * 50;
      const nestedOffset = isMobile() ? 255 : 360;
      const submenuX = getMenuX() + depthSep;
      const nestedX = submenuX + nestedOffset;
      let maxNestedTextW = 0;
      for (let i = 0; i < nestedData.length; i++) {
        maxNestedTextW = Math.max(maxNestedTextW, ctx.measureText(nestedData[i].title).width);
      }
      const rightEdge = nestedX + maxNestedTextW + 10;
      const leftEdge = submenuX - 20;
      const combinedCenter = (leftEdge + rightEdge) / 2;
      const canvasCenter = W / 2;
      anim.targetCameraX = canvasCenter - combinedCenter;
    } else if (expandedSubmenuId) {
      const depthSep = isMobile()
        ? theme.spatial.menuDepthSeparation * 25
        : theme.spatial.menuDepthSeparation * 50;
      const submenuX = getMenuX() + depthSep;
      let avgTextW = 0;
      const ep = mainMenu.find(m => m.id === expandedSubmenuId);
      if (ep && ep.submenu) {
        for (let i = 0; i < ep.submenu.length; i++) {
          avgTextW += ctx.measureText(ep.submenu[i].title).width;
        }
        avgTextW /= ep.submenu.length;
      }
      const submenuCenter = submenuX + avgTextW / 2;
      const canvasCenter = W / 2;
      anim.targetCameraX = canvasCenter - submenuCenter;
    } else {
      anim.targetCameraX = 0;
    }
    anim.cameraX += (anim.targetCameraX - anim.cameraX) * 0.06;

    ctx.save();
    ctx.translate(anim.cameraX, 0);

    // ── Recalculate main menu targets ──
    for (let i = 0; i < mainMenu.length; i++) {
      const pos = getMenuPositionPx('main', i, mainMenu.length);
      anim.mainItems[i].targetX = pos.x;
      anim.mainItems[i].targetY = pos.y;

      const isActive = activeMenuItem === mainMenu[i].id || expandedSubmenuId === mainMenu[i].id;
      const tw = ctx.measureText(mainMenu[i].title).width;
      const isHov = isPointInRect(
        mouse.x - anim.cameraX, mouse.y,
        anim.mainItems[i].x - 5, anim.mainItems[i].y,
        tw + 10, hitHeight
      );
      anim.mainItems[i].targetOpacity = isActive ? 1 : isHov ? 1 : 0.5;
    }

    // ── Lerp main menu ──
    for (let i = 0; i < anim.mainItems.length; i++) {
      const item = anim.mainItems[i];
      item.x += (item.targetX - item.x) * 0.1;
      item.y += (item.targetY - item.y) * 0.1;
      item.opacity += (item.targetOpacity - item.opacity) * 0.15;
    }

    while (anim.subItems.length < submenuData.length) {
      const idx = anim.subItems.length;
      const pos = getMenuPositionPx('submenu', idx, submenuData.length);
      anim.subItems.push({
        x: pos.x, y: pos.y + 30,
        targetX: pos.x, targetY: pos.y,
        opacity: 0, targetOpacity: 0.5,
      });
    }

    // Detect open/close
    if (expandedSubmenuId && !anim.prevExpandedSubmenuIdForAnim) {
      anim.subAnimStartTime = millis;
      anim.subAnimDirection = 1;
    } else if (!expandedSubmenuId && anim.prevExpandedSubmenuIdForAnim) {
      anim.subAnimStartTime = millis;
      anim.subAnimDirection = -1;
    }
    anim.prevExpandedSubmenuIdForAnim = expandedSubmenuId;

    const subAnimDuration = 400;
    const subAnimStagger = 60;
    const subSlideOffset = 25;
    const elapsed = millis - anim.subAnimStartTime;

    for (let i = 0; i < submenuData.length; i++) {
      const pos = getMenuPositionPx('submenu', i, submenuData.length);
      anim.subItems[i].targetX = pos.x;
      anim.subItems[i].targetY = pos.y;

      if (expandedSubmenuId) {
        const isActive = activeMenuItem === submenuData[i].id;
        const tw = ctx.measureText(submenuData[i].title).width;
        const isHov = isPointInRect(
          mouse.x - anim.cameraX, mouse.y,
          anim.subItems[i].x - 5, anim.subItems[i].y,
          tw + 10, hitHeight
        );
        anim.subItems[i].targetOpacity = isActive ? 1 : isHov ? 1 : 0.5;
      } else {
        anim.subItems[i].targetOpacity = 0;
      }
    }

    for (let i = 0; i < anim.subItems.length; i++) {
      const item = anim.subItems[i];
      const itemDelay = i * subAnimStagger;
      let t;
      if (anim.subAnimDirection === 1) {
        t = Math.max(0, Math.min(1, (elapsed - itemDelay) / subAnimDuration));
      } else if (anim.subAnimDirection === -1) {
        const reverseDelay = (anim.subItems.length - 1 - i) * subAnimStagger;
        t = 1 - Math.max(0, Math.min(1, (elapsed - reverseDelay) / subAnimDuration));
      } else {
        t = expandedSubmenuId ? 1 : 0;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      item.x += (item.targetX - item.x) * 0.15;
      item.y = item.targetY + subSlideOffset * (1 - eased);
      item.opacity = item.targetOpacity * eased;
    }

    // Clean up faded sub items
    const wireStillAnimating = anim.submenuWireDirection !== 0 || anim.pageWireDirection !== 0;
    if (!expandedSubmenuId && !wireStillAnimating && anim.subItems.every(s => s.opacity < 0.01)) {
      anim.subItems = [];
      anim.subAnimDirection = 0;
    }

    // ── Wire: Parent → Submenu ──
    const subWireDuration = 500;
    if (expandedSubmenuId && !anim.submenuWireVisible) {
      anim.submenuWireStartTime = millis;
      anim.submenuWireDirection = 1;
      anim.submenuWireVisible = true;
      anim.submenuWireEndpoints = null;
    } else if (!expandedSubmenuId && anim.submenuWireVisible) {
      const closingParentId = anim.prevExpandedSubmenuId || expandedSubmenuId;
      const closingParentIdx = mainMenu.findIndex(m => m.id === closingParentId);
      if (closingParentIdx !== -1 && anim.subItems.length > 0) {
        const pi = anim.mainItems[closingParentIdx];
        const ptw = ctx.measureText(mainMenu[closingParentIdx].title).width;
        const scy = (anim.subItems[0].y + anim.subItems[anim.subItems.length - 1].y) / 2;
        const slx = anim.subItems[0].x - 10;
        anim.submenuWireEndpoints = { x1: pi.x + ptw + 8, y1: pi.y, x2: slx, y2: scy };
      }
      anim.submenuWireStartTime = millis;
      anim.submenuWireDirection = -1;
      anim.submenuWireVisible = false;
    }

    let submenuWireT = 0;
    if (anim.submenuWireDirection !== 0) {
      const wElapsed = millis - anim.submenuWireStartTime;
      const raw = Math.max(0, Math.min(1, wElapsed / subWireDuration));
      const eased = easeInOutCubic(raw);
      submenuWireT = anim.submenuWireDirection === 1 ? eased : 1 - eased;
      if (raw >= 1) {
        anim.submenuWireDirection = 0;
        anim.submenuWireEndpoints = null;
      }
    } else {
      submenuWireT = expandedSubmenuId ? 1 : 0;
    }

    if (submenuWireT > 0.01) {
      let wireX1, wireY1, wireX2, wireY2;
      if (anim.submenuWireEndpoints) {
        wireX1 = anim.submenuWireEndpoints.x1;
        wireY1 = anim.submenuWireEndpoints.y1;
        wireX2 = anim.submenuWireEndpoints.x2;
        wireY2 = anim.submenuWireEndpoints.y2;
      } else if (expandedParent) {
        const parentIdx = mainMenu.findIndex(m => m.id === expandedSubmenuId);
        if (parentIdx !== -1 && anim.subItems.length > 0) {
          const parentItem = anim.mainItems[parentIdx];
          wireX1 = parentItem.x + ctx.measureText(mainMenu[parentIdx].title).width + 8;
          wireY1 = parentItem.y;
          wireY2 = (anim.subItems[0].y + anim.subItems[anim.subItems.length - 1].y) / 2;
          wireX2 = anim.subItems[0].x - 10;
        }
      }
      if (wireX1 !== undefined) {
        drawBezierWire(ctx, wireX1, wireY1, wireX2, wireY2, submenuWireT, wireColor, 0.6, 1);
      }
    }

    // ══════════════════════════════════════════
    // ── Nested submenu items (third level) ──
    // ══════════════════════════════════════════

    // Ensure anim.nestedItems has enough slots
    while (anim.nestedItems.length < nestedData.length) {
      const idx = anim.nestedItems.length;
      const pos = getMenuPositionPx('nested', idx, nestedData.length);
      anim.nestedItems.push({
        x: pos.x, y: pos.y + 30,
        targetX: pos.x, targetY: pos.y,
        opacity: 0, targetOpacity: 0.5,
      });
    }

    // Detect nested open/close transitions
    if (expandedNestedSubmenuId && !anim.prevExpandedNestedIdForAnim) {
      anim.nestedAnimStartTime = millis;
      anim.nestedAnimDirection = 1;
    } else if (!expandedNestedSubmenuId && anim.prevExpandedNestedIdForAnim) {
      anim.nestedAnimStartTime = millis;
      anim.nestedAnimDirection = -1;
    }
    anim.prevExpandedNestedIdForAnim = expandedNestedSubmenuId;

    const nestedElapsed = millis - anim.nestedAnimStartTime;

    for (let i = 0; i < nestedData.length; i++) {
      const pos = getMenuPositionPx('nested', i, nestedData.length);
      anim.nestedItems[i].targetX = pos.x;
      anim.nestedItems[i].targetY = pos.y;

      if (expandedNestedSubmenuId) {
        const isActive = activeMenuItem === nestedData[i].id || currentView === nestedData[i].id;
        const tw = ctx.measureText(nestedData[i].title).width;
        const isHov = isPointInRect(
          mouse.x - anim.cameraX, mouse.y,
          anim.nestedItems[i].x - 5, anim.nestedItems[i].y,
          tw + 10, hitHeight
        );
        anim.nestedItems[i].targetOpacity = isActive ? 1 : isHov ? 1 : 0.5;
      } else {
        anim.nestedItems[i].targetOpacity = 0;
      }
    }

    for (let i = 0; i < anim.nestedItems.length; i++) {
      const item = anim.nestedItems[i];
      const itemDelay = i * subAnimStagger;
      let t;
      if (anim.nestedAnimDirection === 1) {
        t = Math.max(0, Math.min(1, (nestedElapsed - itemDelay) / subAnimDuration));
      } else if (anim.nestedAnimDirection === -1) {
        const reverseDelay = (anim.nestedItems.length - 1 - i) * subAnimStagger;
        t = 1 - Math.max(0, Math.min(1, (nestedElapsed - reverseDelay) / subAnimDuration));
      } else {
        t = expandedNestedSubmenuId ? 1 : 0;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      item.x += (item.targetX - item.x) * 0.15;
      item.y = item.targetY + subSlideOffset * (1 - eased);
      item.opacity = item.targetOpacity * eased;
    }

    // Clean up faded nested items
    const nestedWireStillAnimating = anim.nestedWireDirection !== 0;
    if (!expandedNestedSubmenuId && !nestedWireStillAnimating && anim.nestedItems.every(n => n.opacity < 0.01)) {
      anim.nestedItems = [];
      anim.nestedAnimDirection = 0;
    }

    // ── Wire: Submenu parent → Nested items ──
    const nestedWireDuration = 500;
    if (expandedNestedSubmenuId && !anim.nestedWireVisible) {
      anim.nestedWireStartTime = millis;
      anim.nestedWireDirection = 1;
      anim.nestedWireVisible = true;
      anim.nestedWireEndpoints = null;
    } else if (!expandedNestedSubmenuId && anim.nestedWireVisible) {
      // Cache endpoints
      const closingNestedId = anim.prevExpandedNestedId || expandedNestedSubmenuId;
      const closingNestedIdx = submenuData.findIndex(s => s.id === closingNestedId);
      if (closingNestedIdx !== -1 && anim.subItems[closingNestedIdx] && anim.nestedItems.length > 0) {
        const pi = anim.subItems[closingNestedIdx];
        const ptw = ctx.measureText(submenuData[closingNestedIdx].title).width;
        const ncy = (anim.nestedItems[0].y + anim.nestedItems[anim.nestedItems.length - 1].y) / 2;
        const nlx = anim.nestedItems[0].x - 10;
        anim.nestedWireEndpoints = {
          x1: pi.x + ptw + 8, y1: pi.y,
          x2: nlx, y2: ncy
        };
      }
      anim.nestedWireStartTime = millis;
      anim.nestedWireDirection = -1;
      anim.nestedWireVisible = false;
    }

    let nestedWireT = 0;
    if (anim.nestedWireDirection !== 0) {
      const nwElapsed = millis - anim.nestedWireStartTime;
      const raw = Math.max(0, Math.min(1, nwElapsed / nestedWireDuration));
      const eased = easeInOutCubic(raw);
      nestedWireT = anim.nestedWireDirection === 1 ? eased : 1 - eased;
      if (raw >= 1) {
        anim.nestedWireDirection = 0;
        anim.nestedWireEndpoints = null;
      }
    } else {
      nestedWireT = expandedNestedSubmenuId ? 1 : 0;
    }

    if (nestedWireT > 0.01) {
      let nwX1, nwY1, nwX2, nwY2;
      if (anim.nestedWireEndpoints) {
        nwX1 = anim.nestedWireEndpoints.x1;
        nwY1 = anim.nestedWireEndpoints.y1;
        nwX2 = anim.nestedWireEndpoints.x2;
        nwY2 = anim.nestedWireEndpoints.y2;
      } else if (nestedParent) {
        const parentIdx = submenuData.findIndex(s => s.id === expandedNestedSubmenuId);
        if (parentIdx !== -1 && anim.subItems[parentIdx] && anim.nestedItems.length > 0) {
          const parentItem = anim.subItems[parentIdx];
          nwX1 = parentItem.x + ctx.measureText(submenuData[parentIdx].title).width + 8;
          nwY1 = parentItem.y;
          const firstY = anim.nestedItems[0].y;
          const lastY = anim.nestedItems[anim.nestedItems.length - 1].y;
          nwY2 = (firstY + lastY) / 2;
          nwX2 = anim.nestedItems[0].x - 10;
        }
      }
      if (nwX1 !== undefined) {
        drawBezierWire(ctx, nwX1, nwY1, nwX2, nwY2, nestedWireT, wireColor, 0.6, 1);
      }
    }
    anim.prevExpandedNestedId = expandedNestedSubmenuId;

    // ── Wire: Active item → Content area edge ──
    const pageWireDuration = 500;
    const leftColW = W; // canvas is the left column
    const shouldShowPageWire = currentView && currentView !== 'home' && activeMenuItem;

    if (shouldShowPageWire && anim.prevActiveMenuItem !== activeMenuItem) {
      anim.pageWireItem = activeMenuItem;
      anim.pageWireStartTime = millis;
      anim.pageWireDirection = 1;
      anim.pageWireEndpoints = null;
    }
    if (shouldShowPageWire && !anim.pageWireVisible) {
      anim.pageWireStartTime = millis;
      anim.pageWireDirection = 1;
      anim.pageWireVisible = true;
      anim.pageWireEndpoints = null;
    } else if (!shouldShowPageWire && anim.pageWireVisible) {
      if (anim.pageWireItem) {
        let ix = 0, iy = 0, itw = 0;
        const mi = mainMenu.findIndex(m => m.id === anim.pageWireItem);
        if (mi !== -1) {
          ix = anim.mainItems[mi].x;
          iy = anim.mainItems[mi].y;
          itw = ctx.measureText(mainMenu[mi].title).width;
        } else if (expandedParent) {
          const si = submenuData.findIndex(s => s.id === anim.pageWireItem);
          if (si !== -1 && anim.subItems[si]) {
            ix = anim.subItems[si].x;
            iy = anim.subItems[si].y;
            itw = ctx.measureText(submenuData[si].title).width;
          } else if (nestedParent || anim.prevExpandedNestedId) {
            const nestedSrc = nestedParent?.submenu || (anim.prevExpandedNestedId ? submenuData.find(s => s.id === anim.prevExpandedNestedId)?.submenu : null) || [];
            const ni = nestedSrc.findIndex(n => n.id === anim.pageWireItem);
            if (ni !== -1 && anim.nestedItems[ni]) {
              ix = anim.nestedItems[ni].x;
              iy = anim.nestedItems[ni].y;
              itw = ctx.measureText(nestedSrc[ni].title).width;
            }
          }
        }
        if (itw > 0) {
          const cle = leftColW - anim.cameraX;
          anim.pageWireEndpoints = { x1: ix + itw + 8, y1: iy, x2: cle, y2: iy - 40 };
        }
      }
      anim.pageWireStartTime = millis;
      anim.pageWireDirection = -1;
      anim.pageWireVisible = false;
    }

    let pageWireT = 0;
    if (anim.pageWireDirection !== 0) {
      const pElapsed = millis - anim.pageWireStartTime;
      const raw = Math.max(0, Math.min(1, pElapsed / pageWireDuration));
      const eased = easeInOutCubic(raw);
      pageWireT = anim.pageWireDirection === 1 ? eased : 1 - eased;
      if (raw >= 1) {
        anim.pageWireDirection = 0;
        anim.pageWireEndpoints = null;
        if (!shouldShowPageWire) anim.pageWireItem = activeMenuItem;
      }
    } else {
      pageWireT = shouldShowPageWire ? 1 : 0;
      if (!shouldShowPageWire) anim.pageWireItem = activeMenuItem;
    }

    if (pageWireT > 0.01 && !isMobile()) {
      let pwX1, pwY1, pwX2, pwY2;
      if (anim.pageWireEndpoints) {
        pwX1 = anim.pageWireEndpoints.x1;
        pwY1 = anim.pageWireEndpoints.y1;
        pwX2 = anim.pageWireEndpoints.x2;
        pwY2 = anim.pageWireEndpoints.y2;
      } else if (anim.pageWireItem) {
        const mi = mainMenu.findIndex(m => m.id === anim.pageWireItem);
        if (mi !== -1) {
          pwX1 = anim.mainItems[mi].x + ctx.measureText(mainMenu[mi].title).width + 8;
          pwY1 = anim.mainItems[mi].y;
        } else if (expandedParent) {
          const si = submenuData.findIndex(s => s.id === anim.pageWireItem);
          if (si !== -1 && anim.subItems[si]) {
            pwX1 = anim.subItems[si].x + ctx.measureText(submenuData[si].title).width + 8;
            pwY1 = anim.subItems[si].y;
          } else if (nestedData.length > 0) {
            const ni = nestedData.findIndex(n => n.id === anim.pageWireItem);
            if (ni !== -1 && anim.nestedItems[ni]) {
              pwX1 = anim.nestedItems[ni].x + ctx.measureText(nestedData[ni].title).width + 8;
              pwY1 = anim.nestedItems[ni].y;
            }
          }
        }
        if (pwX1 !== undefined) {
          pwX2 = leftColW - anim.cameraX;
          pwY2 = pwY1 - 40;
        }
      }
      if (pwX1 !== undefined) {
        drawBezierWire(ctx, pwX1, pwY1, pwX2, pwY2, pageWireT, wireColor, 0.4, 1);
      }
    }

    anim.prevActiveMenuItem = activeMenuItem;
    anim.prevExpandedSubmenuId = expandedSubmenuId;
    anim.prevCurrentView = currentView;

    // ── Draw main menu text ──
    for (let i = 0; i < mainMenu.length; i++) {
      const item = anim.mainItems[i];
      ctx.fillStyle = withAlpha(textColor, item.opacity);
      ctx.fillText(mainMenu[i].title, item.x, item.y);
    }

    // ── Draw submenu text ──
    for (let i = 0; i < submenuData.length; i++) {
      if (i >= anim.subItems.length) break;
      const item = anim.subItems[i];
      if (item.opacity < 0.01) continue;
      ctx.fillStyle = withAlpha(textColor, item.opacity);
      ctx.fillText(submenuData[i].title, item.x, item.y);
    }

    // ── Draw nested submenu text ──
    for (let i = 0; i < nestedData.length; i++) {
      if (i >= anim.nestedItems.length) break;
      const item = anim.nestedItems[i];
      if (item.opacity < 0.01) continue;
      ctx.fillStyle = withAlpha(textColor, item.opacity);
      ctx.fillText(nestedData[i].title, item.x, item.y);
    }

    // ── Back button ──
    const canGoBack = state.canGoBack();
    anim.backButton.targetScale = canGoBack ? 1 : 0;
    anim.backButton.scale += (anim.backButton.targetScale - anim.backButton.scale) * 0.12;

    if (anim.backButton.scale > 0.01) {
      let bx, by;
      if (expandedNestedSubmenuId && anim.nestedItems.length > 0) {
        bx = anim.nestedItems[0].x + 4;
        by = anim.nestedItems[0].y - 30;
      } else if (expandedSubmenuId && anim.subItems.length > 0) {
        bx = anim.subItems[0].x + 4;
        by = anim.subItems[0].y - 30;
      } else if (anim.mainItems.length > 0) {
        bx = anim.mainItems[0].x + 4;
        by = anim.mainItems[0].y - 30;
      } else {
        bx = getMenuX() + 4;
        by = 80;
      }
      anim.backButton.targetX = bx;
      anim.backButton.targetY = by;
      anim.backButton.x += (anim.backButton.targetX - anim.backButton.x) * 0.1;
      anim.backButton.y += (anim.backButton.targetY - anim.backButton.y) * 0.1;

      const backBtnSize = isMobile() ? 40 : 24;
      const backHovered = isPointInRect(
        mouse.x - anim.cameraX, mouse.y,
        anim.backButton.x - backBtnSize / 2, anim.backButton.y, backBtnSize, backBtnSize
      );
      drawBackButton(ctx, anim.backButton.x, anim.backButton.y, anim.backButton.scale, textColor, backHovered);
    }

    ctx.restore(); // End camera offset

    // ── Cursor hover state ──
    const mx = mouse.x - anim.cameraX;
    const my = mouse.y;
    let isHovering = false;

    for (let i = 0; i < mainMenu.length; i++) {
      const item = anim.mainItems[i];
      const tw = ctx.measureText(mainMenu[i].title).width;
      if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
        isHovering = true;
      }
    }
    for (let i = 0; i < submenuData.length; i++) {
      if (i >= anim.subItems.length) break;
      const item = anim.subItems[i];
      if (item.opacity > 0.1) {
        const tw = ctx.measureText(submenuData[i].title).width;
        if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
          isHovering = true;
        }
      }
    }
    // Check nested items
    for (let i = 0; i < nestedData.length; i++) {
      if (i >= anim.nestedItems.length) break;
      const item = anim.nestedItems[i];
      if (item.opacity > 0.1) {
        const tw = ctx.measureText(nestedData[i].title).width;
        if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
          isHovering = true;
        }
      }
    }
    if (anim.backButton.scale > 0.3) {
      const backSize = isMobile() ? 48 : 36;
      if (isPointInRect(mx, my, anim.backButton.x - backSize / 2, anim.backButton.y, backSize, backSize)) {
        isHovering = true;
      }
    }
    useNavigationStore.getState().setHoveringMenuItem(isHovering);

    // ── Next frame ──
    rafRef.current = requestAnimationFrame(draw);
  }, [getMenuX, getMenuPositionPx, updateDots, drawDots, drawBezierWire, drawBackButton]);

  // ── Lifecycle ──
  useEffect(() => {
    setup();

    // Start drawing
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas._onMouseMove) canvas.removeEventListener('mousemove', canvas._onMouseMove);
        if (canvas._onMouseDown) canvas.removeEventListener('mousedown', canvas._onMouseDown);
        if (canvas._onTouchStart) canvas.removeEventListener('touchstart', canvas._onTouchStart);
        if (canvas._onTouchMove) canvas.removeEventListener('touchmove', canvas._onTouchMove);
        if (canvas._onTouchEnd) canvas.removeEventListener('touchend', canvas._onTouchEnd);
        if (canvas._onResize) window.removeEventListener('resize', canvas._onResize);
        canvas.remove();
      }
      canvasRef.current = null;
      ctxRef.current = null;
    };
  }, [setup, draw]);

  return <div ref={containerRef} className="p5-menu-container" />;
}

export default P5Menu;
