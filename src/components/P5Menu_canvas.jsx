import { useEffect, useLayoutEffect, useRef, useCallback, useState } from 'react';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes, theme } from '../config/theme';
import './P5Menu.css';

// ── Pure-math helpers (replace p5.bezierPoint) ──
function bezierPoint(a, b, c, d, t) {
  const t1 = 1 - t;
  return t1 * t1 * t1 * a + 3 * t1 * t1 * t * b + 3 * t1 * t * t * c + t * t * t * d;
}

// Menu titles are measured many times per frame with the same font, so cache
// the widths. Cleared once the menu font finishes loading.
const textWidthCache = new Map();
function textWidth(ctx, text) {
  const key = `${ctx.font}|${text}`;
  let w = textWidthCache.get(key);
  if (w === undefined) {
    w = ctx.measureText(text).width;
    textWidthCache.set(key, w);
  }
  return w;
}

// Stop drawing once this much time AND this many frames have passed without
// input or navigation. Every animation here is started by one of those; the
// timed ones finish within ~1s and the per-frame eases within ~150 frames.
// Counting frames too keeps a throttled tab from stopping mid-animation.
const IDLE_MS = 3000;
const IDLE_FRAMES = 240;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const isMobile = () => window.innerWidth <= 768;

// ── Nav box layout ──
// The menu is drawn inside a rounded box. On home the box is open and centred
// in the left column; elsewhere it collapses to the top-left corner and opens
// on hover (or tap). The open box is as tall as the deepest open menu column
// needs, and that column is centred horizontally. The menu canvas is sized to
// the largest the open box can get.
const BOX_MARGIN = 10;
// The name sits this far in from the box's left edge
const BOX_INSET = 10;
// Collapsed box padding around the header text: top/bottom and right
const BOX_PAD_Y = 8;
// Gap between the collapsed box and the back button under it
const OUTSIDE_BACK_GAP = 8;
const BOX_PAD_RIGHT = 160;
// Centre of the first menu item, below the name
const MENU_FIRST_Y = 52;
// From the last item's centre to the bottom of the box
const MENU_BOTTOM_PAD = 24;
// Extra space above and below the menu, given up when the column is too short
const MENU_BREATHING = 16;
// How far past the box's right edge the active item's wire ends, so it leaves the box
const PAGE_WIRE_OVERSHOOT = 20;
// Keyboard highlight behind the selected menu item
const KEYBOARD_HIGHLIGHT = '#dcdcdc';
const KEYBOARD_PAD_X = 6;
const KEYBOARD_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape']);
// Ignore hover while the box flies from the centre to the top after leaving
// home, so a pointer that was over the big box doesn't reopen it mid-flight
const HOVER_SUPPRESS_MS = 700;
const HOVER_CLOSE_DELAY_MS = 150;

function getColumnSize() {
  if (isMobile()) return { w: window.innerWidth, h: Math.floor(window.innerHeight * 0.35) };
  return { w: Math.floor(window.innerWidth * theme.layout.leftColumnRatio), h: window.innerHeight };
}

function getOpenBoxSize() {
  const col = getColumnSize();
  // On desktop the box runs to the column edge, so the content panel's own
  // 10px inset makes the gap beside it match its margin from the screen edge
  const w = isMobile() ? col.w - BOX_MARGIN * 2 : col.w - BOX_MARGIN;
  return { w, h: col.h - BOX_MARGIN * 2 };
}

// Items in one menu column: 'main', the open 'submenu', or the open 'nested' one
function getColumnItems(state, level) {
  const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
  if (level === 'main') return mainMenu;
  const submenu = mainMenu.find(m => m.id === state.expandedSubmenuId)?.submenu || [];
  if (level === 'submenu') return submenu;
  return submenu.find(s => s.id === state.expandedNestedSubmenuId)?.submenu || [];
}

// Opening a main menu item, by click or keyboard
function openMainItem(menuItem) {
  const state = useNavigationStore.getState();
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
}

// The deepest open menu column and the vertical layout built around it. Every
// column is centred on the same line so the wires between them stay level.
function getMenuMetrics(state) {
  const mainMenu = getColumnItems(state, 'main');
  const submenu = getColumnItems(state, 'submenu');
  const nested = getColumnItems(state, 'nested');
  let level = 'main';
  let items = mainMenu;
  if (nested.length > 0) {
    level = 'nested';
    items = nested;
  } else if (state.expandedSubmenuId) {
    level = 'submenu';
    items = submenu;
  }
  const spacing = isMobile() ? 20 : 25;
  const span = (items.length - 1) * spacing;
  const compactHeight = MENU_FIRST_Y + span + MENU_BOTTOM_PAD;
  const maxHeight = getOpenBoxSize().h;
  const breathing = Math.max(0, Math.min(MENU_BREATHING, (maxHeight - compactHeight) / 2));
  return {
    level,
    items,
    spacing,
    centerY: MENU_FIRST_Y + breathing + span / 2,
    height: Math.min(compactHeight + breathing * 2, maxHeight),
  };
}

function BackArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M10 10 L2 2 M2 7.5 L2 2 L7.5 2" />
    </svg>
  );
}

function findTitle(items, id) {
  for (const item of items) {
    if (item.id === id) return item.title;
    if (item.submenu) {
      const title = findTitle(item.submenu, id);
      if (title) return title;
    }
  }
  return null;
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
  // Left column: dot grid canvas
  const containerRef = useRef(null);
  const dotsCanvasRef = useRef(null);
  const dotsCtxRef = useRef(null);
  const dotMouseRef = useRef({ x: -9999, y: -9999 });
  // Nav box: menu canvas
  const boxRef = useRef(null);
  const menuHostRef = useRef(null);
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef(null);
  // Arrow-key selection: which column and row is highlighted
  const keyboardRef = useRef({ active: false, level: 'main', index: 0 });
  const startTimeRef = useRef(performance.now());
  const lastActivityRef = useRef(performance.now());
  const framesSinceActivityRef = useRef(0);

  // ── Animation state (persistent across frames) ──
  const animRef = useRef({
    mainItems: [],
    subItems: [],
    subAnimStartTime: 0,
    subAnimDirection: 0,
    prevExpandedSubmenuIdForAnim: null,
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
    cameraPlaced: false,
    keyboardRect: null,
    keyboardOpacity: 0,
    targetCameraX: 0,
    dotPositions: [],
    dotBasePositions: [],
    prevExpandedSubmenuId: null,
    prevPageWireTarget: null,
    prevCurrentView: null,
    pageWireItem: null,
    fontReady: false,
  });

  // ── Layout (menu coordinates are relative to the open nav box) ──
  // Columns sit at fixed offsets from each other; the camera centres the
  // deepest open one in the box
  const getMenuX = useCallback(() => 0, []);

  const getMenuPositionPx = useCallback((menuLevel, itemIndex, itemCount) => {
    const { spacing, centerY } = getMenuMetrics(useNavigationStore.getState());
    const totalHeight = (itemCount - 1) * spacing;
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
  }, [getMenuX]);

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
    const menuHost = menuHostRef.current;
    if (!container || !menuHost) return;

    // High-DPI sizing helper
    const createCanvas = (parent, getSize) => {
      const canvas = document.createElement('canvas');
      canvas.style.display = 'block';
      parent.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      canvas._sizeCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const { w, h } = getSize();
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      canvas._sizeCanvas();
      return { canvas, ctx };
    };

    // Dot grid fills the left column; the menu canvas is sized to the open box
    const dots = createCanvas(container, getColumnSize);
    dotsCanvasRef.current = dots.canvas;
    dotsCtxRef.current = dots.ctx;

    const { canvas } = createCanvas(menuHost, getOpenBoxSize);
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext('2d');

    // Load Inter Bold through the @font-face rules in index.css
    const anim = animRef.current;
    document.fonts.load('bold 20px Inter').then(() => {
      textWidthCache.clear();
      anim.fontReady = true;
    }).catch(() => {
      // Draw with the fallback font
      textWidthCache.clear();
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

    // Same when the mouse leaves, so hover state doesn't stay stuck at the
    // point where the pointer exited
    const onMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas._onMouseLeave = onMouseLeave;

    // The dot field pushes away from the pointer; it sits under the nav box,
    // so it only sees the pointer while it's over the bare column
    const dotsCanvas = dots.canvas;
    const onDotsMouseMove = (e) => {
      const rect = dotsCanvas.getBoundingClientRect();
      dotMouseRef.current.x = e.clientX - rect.left;
      dotMouseRef.current.y = e.clientY - rect.top;
    };
    const onDotsMouseLeave = () => {
      dotMouseRef.current.x = -9999;
      dotMouseRef.current.y = -9999;
    };
    dotsCanvas.addEventListener('mousemove', onDotsMouseMove);
    dotsCanvas.addEventListener('mouseleave', onDotsMouseLeave);
    dotsCanvas._onMouseMove = onDotsMouseMove;
    dotsCanvas._onMouseLeave = onDotsMouseLeave;

    // Resize
    const onResize = () => {
      canvas._sizeCanvas();
      dotsCanvas._sizeCanvas();
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

  }, [getMenuPositionPx, initDots]);

  // ── Click handler ──
  const handleClick = useCallback((rawX, rawY) => {
    const anim = animRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const mx = rawX - anim.cameraX;
    const my = rawY;
    const fontSize = isMobile() ? 16 : 20;
    const hitHeight = isMobile() ? 40 : fontSize + 8;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;

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

    // Check nested items first (deepest level has priority)
    for (let i = 0; i < nestedData.length; i++) {
      if (i >= anim.nestedItems.length) break;
      const item = anim.nestedItems[i];
      if (item.opacity > 0.1) {
        const tw = textWidth(ctx, nestedData[i].title);
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
      const tw = textWidth(ctx, mainMenu[i].title);
      if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
        openMainItem(mainMenu[i]);
        return;
      }
    }

    // Submenu items
    for (let i = 0; i < submenuData.length; i++) {
      if (i >= anim.subItems.length) break;
      const item = anim.subItems[i];
      if (item.opacity > 0.1) {
        const tw = textWidth(ctx, submenuData[i].title);
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
    // Single path for all dots: one fill call instead of one per dot
    ctx.beginPath();
    for (let i = 0; i < anim.dotPositions.length; i++) {
      const dot = anim.dotPositions[i];
      ctx.moveTo(dot.x + half, dot.y);
      ctx.arc(dot.x, dot.y, half, 0, Math.PI * 2);
    }
    ctx.fill();
  }, []);

  const updateDots = useCallback(() => {
    const anim = animRef.current;
    const mouse = dotMouseRef.current;
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

  // ── Main draw loop ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const dotsCanvas = dotsCanvasRef.current;
    const dctx = dotsCtxRef.current;
    const anim = animRef.current;
    if (!canvas || !ctx || !dotsCanvas || !dctx || !anim.fontReady) {
      lastActivityRef.current = performance.now(); // don't go idle before the first real frame
      framesSinceActivityRef.current = 0;
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const mouse = mouseRef.current;
    const millis = performance.now() - startTimeRef.current;
    const col = getColumnSize();

    // Reset transform for clear, then re-apply DPR scale. The menu canvas stays
    // transparent so the nav box's background shows through.
    const dpr = window.devicePixelRatio || 1;
    for (const c of [ctx, dctx]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ── Read store ──
    const state = useNavigationStore.getState();
    const { currentView, activeMenuItem, expandedSubmenuId, expandedNestedSubmenuId, currentTheme, isThemeInverted } = state;
    const kb = keyboardRef.current;
    const isKeyboardItem = (level, i) => kb.active && kb.level === level && kb.index === i;
    const activeColors = colorThemes[currentTheme];

    const bgColor = isThemeInverted ? activeColors.text : activeColors.background;
    const textColor = isThemeInverted ? activeColors.background : activeColors.text;
    const wireColor = isThemeInverted ? activeColors.background : activeColors.wire;

    // ── Column background + dots ──
    dctx.fillStyle = bgColor;
    dctx.fillRect(0, 0, col.w, col.h);
    if (!isMobile()) {
      updateDots();
      drawDots(dctx, textColor);
    }

    // ── Font setup ──
    const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
    const fontSize = isMobile() ? 16 : 20;
    const hitHeight = isMobile() ? 40 : fontSize + 8;
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // ── Resolve submenu and nested data ──
    const expandedParent = expandedSubmenuId ? mainMenu.find(m => m.id === expandedSubmenuId) : null;
    const submenuData = expandedParent?.submenu || [];
    const nestedParent = expandedNestedSubmenuId
      ? submenuData.find(s => s.id === expandedNestedSubmenuId)
      : null;
    const nestedData = nestedParent?.submenu || [];

    // ── Camera offset: centre the deepest open column in the box ──
    const metrics = getMenuMetrics(state);
    let widest = 0;
    for (let i = 0; i < metrics.items.length; i++) {
      widest = Math.max(widest, textWidth(ctx, metrics.items[i].title));
    }
    const columnX = (getOpenBoxSize().w - widest) / 2;
    anim.targetCameraX = columnX - getMenuPositionPx(metrics.level, 0, 1).x;
    // Start in place rather than sliding in on the first frame
    if (!anim.cameraPlaced) {
      anim.cameraX = anim.targetCameraX;
      anim.cameraPlaced = true;
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
      const tw = textWidth(ctx, mainMenu[i].title);
      const isHov = isPointInRect(
        mouse.x - anim.cameraX, mouse.y,
        anim.mainItems[i].x - 5, anim.mainItems[i].y,
        tw + 10, hitHeight
      );
      anim.mainItems[i].targetOpacity = isActive || isHov || isKeyboardItem('main', i) ? 1 : 0.5;
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
        const tw = textWidth(ctx, submenuData[i].title);
        const isHov = isPointInRect(
          mouse.x - anim.cameraX, mouse.y,
          anim.subItems[i].x - 5, anim.subItems[i].y,
          tw + 10, hitHeight
        );
        anim.subItems[i].targetOpacity = isActive || isHov || isKeyboardItem('submenu', i) ? 1 : 0.5;
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
        const ptw = textWidth(ctx, mainMenu[closingParentIdx].title);
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
          wireX1 = parentItem.x + textWidth(ctx, mainMenu[parentIdx].title) + 8;
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
        const tw = textWidth(ctx, nestedData[i].title);
        const isHov = isPointInRect(
          mouse.x - anim.cameraX, mouse.y,
          anim.nestedItems[i].x - 5, anim.nestedItems[i].y,
          tw + 10, hitHeight
        );
        anim.nestedItems[i].targetOpacity = isActive || isHov || isKeyboardItem('nested', i) ? 1 : 0.5;
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
        const ptw = textWidth(ctx, submenuData[closingNestedIdx].title);
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
          nwX1 = parentItem.x + textWidth(ctx, submenuData[parentIdx].title) + 8;
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

    // ── Wire: Current page's item → off the box's right edge, toward the content ──
    // Only from an item in the centred column; a parent off to the left (e.g.
    // Work while its list is open) would send the wire across the list
    const pageWireDuration = 500;
    const pageWireEndX = getOpenBoxSize().w + PAGE_WIRE_OVERSHOOT;
    const pageWireTarget = metrics.items.some(item => item.id === currentView) ? currentView : null;
    const shouldShowPageWire = currentView !== 'home' && pageWireTarget;

    if (shouldShowPageWire && anim.prevPageWireTarget !== pageWireTarget) {
      anim.pageWireItem = pageWireTarget;
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
          itw = textWidth(ctx, mainMenu[mi].title);
        } else if (expandedParent) {
          const si = submenuData.findIndex(s => s.id === anim.pageWireItem);
          if (si !== -1 && anim.subItems[si]) {
            ix = anim.subItems[si].x;
            iy = anim.subItems[si].y;
            itw = textWidth(ctx, submenuData[si].title);
          } else if (nestedParent || anim.prevExpandedNestedId) {
            const nestedSrc = nestedParent?.submenu || (anim.prevExpandedNestedId ? submenuData.find(s => s.id === anim.prevExpandedNestedId)?.submenu : null) || [];
            const ni = nestedSrc.findIndex(n => n.id === anim.pageWireItem);
            if (ni !== -1 && anim.nestedItems[ni]) {
              ix = anim.nestedItems[ni].x;
              iy = anim.nestedItems[ni].y;
              itw = textWidth(ctx, nestedSrc[ni].title);
            }
          }
        }
        if (itw > 0) {
          anim.pageWireEndpoints = { x1: ix + itw + 8, y1: iy, x2: pageWireEndX - anim.cameraX, y2: iy - 40 };
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
        if (!shouldShowPageWire) anim.pageWireItem = pageWireTarget;
      }
    } else {
      pageWireT = shouldShowPageWire ? 1 : 0;
      if (!shouldShowPageWire) anim.pageWireItem = pageWireTarget;
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
          pwX1 = anim.mainItems[mi].x + textWidth(ctx, mainMenu[mi].title) + 8;
          pwY1 = anim.mainItems[mi].y;
        } else if (expandedParent) {
          const si = submenuData.findIndex(s => s.id === anim.pageWireItem);
          if (si !== -1 && anim.subItems[si]) {
            pwX1 = anim.subItems[si].x + textWidth(ctx, submenuData[si].title) + 8;
            pwY1 = anim.subItems[si].y;
          } else if (nestedData.length > 0) {
            const ni = nestedData.findIndex(n => n.id === anim.pageWireItem);
            if (ni !== -1 && anim.nestedItems[ni]) {
              pwX1 = anim.nestedItems[ni].x + textWidth(ctx, nestedData[ni].title) + 8;
              pwY1 = anim.nestedItems[ni].y;
            }
          }
        }
        if (pwX1 !== undefined) {
          pwX2 = pageWireEndX - anim.cameraX;
          pwY2 = pwY1 - 40;
        }
      }
      if (pwX1 !== undefined) {
        drawBezierWire(ctx, pwX1, pwY1, pwX2, pwY2, pageWireT, wireColor, 0.4, 1);
      }
    }

    anim.prevPageWireTarget = pageWireTarget;
    anim.prevExpandedSubmenuId = expandedSubmenuId;
    anim.prevCurrentView = currentView;

    // ── Keyboard highlight: a rect that glides between items ──
    let keyboardTarget = null;
    if (kb.active) {
      const columns = {
        main: [anim.mainItems, mainMenu],
        submenu: [anim.subItems, submenuData],
        nested: [anim.nestedItems, nestedData],
      };
      const [positions, data] = columns[kb.level];
      const item = positions[kb.index];
      if (item && data[kb.index]) {
        const height = metrics.spacing - 1;
        keyboardTarget = {
          x: item.x - KEYBOARD_PAD_X,
          y: item.y - height / 2,
          w: textWidth(ctx, data[kb.index].title) + KEYBOARD_PAD_X * 2,
          h: height,
        };
      }
    }
    if (keyboardTarget) {
      if (!anim.keyboardRect || anim.keyboardOpacity < 0.01) anim.keyboardRect = { ...keyboardTarget };
      for (const key of ['x', 'y', 'w', 'h']) {
        anim.keyboardRect[key] += (keyboardTarget[key] - anim.keyboardRect[key]) * 0.3;
      }
    }
    anim.keyboardOpacity += ((keyboardTarget ? 1 : 0) - anim.keyboardOpacity) * 0.25;
    if (anim.keyboardRect && anim.keyboardOpacity > 0.01) {
      const r = anim.keyboardRect;
      ctx.fillStyle = withAlpha(KEYBOARD_HIGHLIGHT, anim.keyboardOpacity);
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, 4);
      ctx.fill();
    }

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

    ctx.restore(); // End camera offset

    // ── Cursor hover state ──
    const mx = mouse.x - anim.cameraX;
    const my = mouse.y;
    let isHovering = false;

    for (let i = 0; i < mainMenu.length; i++) {
      const item = anim.mainItems[i];
      const tw = textWidth(ctx, mainMenu[i].title);
      if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
        isHovering = true;
      }
    }
    for (let i = 0; i < submenuData.length; i++) {
      if (i >= anim.subItems.length) break;
      const item = anim.subItems[i];
      if (item.opacity > 0.1) {
        const tw = textWidth(ctx, submenuData[i].title);
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
        const tw = textWidth(ctx, nestedData[i].title);
        if (isPointInRect(mx, my, item.x - 5, item.y, tw + 10, hitHeight)) {
          isHovering = true;
        }
      }
    }
    useNavigationStore.getState().setHoveringMenuItem(isHovering);

    // ── Next frame (or go idle until woken by input/navigation) ──
    framesSinceActivityRef.current++;
    if (framesSinceActivityRef.current > IDLE_FRAMES && performance.now() - lastActivityRef.current > IDLE_MS) {
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(draw);
  }, [getMenuPositionPx, updateDots, drawDots, drawBezierWire]);

  // ── Lifecycle ──
  const wakeRef = useRef(() => {});
  useEffect(() => {
    setup();

    // Start drawing
    rafRef.current = requestAnimationFrame(draw);

    // Restart the loop after it has gone idle
    const wake = () => {
      lastActivityRef.current = performance.now();
      framesSinceActivityRef.current = 0;
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw);
    };
    wakeRef.current = wake;
    const canvases = [canvasRef.current, dotsCanvasRef.current].filter(Boolean);
    const wakeEvents = ['mousemove', 'mouseleave', 'mousedown', 'touchstart', 'touchmove', 'touchend'];
    canvases.forEach(c => wakeEvents.forEach(ev => c.addEventListener(ev, wake, { passive: true })));
    window.addEventListener('resize', wake);
    const unsubscribe = useNavigationStore.subscribe(wake);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      unsubscribe();
      window.removeEventListener('resize', wake);
      for (const canvas of canvases) {
        wakeEvents.forEach(ev => canvas.removeEventListener(ev, wake));
        if (canvas._onMouseMove) canvas.removeEventListener('mousemove', canvas._onMouseMove);
        if (canvas._onMouseDown) canvas.removeEventListener('mousedown', canvas._onMouseDown);
        if (canvas._onTouchStart) canvas.removeEventListener('touchstart', canvas._onTouchStart);
        if (canvas._onTouchMove) canvas.removeEventListener('touchmove', canvas._onTouchMove);
        if (canvas._onTouchEnd) canvas.removeEventListener('touchend', canvas._onTouchEnd);
        if (canvas._onMouseLeave) canvas.removeEventListener('mouseleave', canvas._onMouseLeave);
        if (canvas._onResize) window.removeEventListener('resize', canvas._onResize);
        canvas.remove();
      }
      canvasRef.current = null;
      ctxRef.current = null;
      dotsCanvasRef.current = null;
      dotsCtxRef.current = null;
    };
  }, [setup, draw]);

  // ── Nav box ──
  const currentView = useNavigationStore(state => state.currentView);
  const navigateToHome = useNavigationStore(state => state.navigateToHome);
  const goBack = useNavigationStore(state => state.goBack);
  const canGoBack = useNavigationStore(state => state.canGoBack());
  const isHome = currentView === 'home';
  // Recomputed on resize too, since `layout` changes then
  const menuHeight = useNavigationStore(state => getMenuMetrics(state).height);
  const currentTitle = isHome || !currentView ? null : findTitle(navigationData.mainMenu, currentView);

  // Opened by hovering with a mouse, or by tapping on touch screens
  const [isExpanded, setIsExpanded] = useState(false);
  // Opened from the keyboard; stays open until Escape, a click outside, or the
  // mouse taking over
  const [keyboardActive, setKeyboardActive] = useState(false);
  const isOpen = isHome || isExpanded || keyboardActive;
  const closeTimerRef = useRef(null);
  const hoverSuppressedUntilRef = useRef(0);
  const openAtPressRef = useRef(false);

  const [layout, setLayout] = useState(() => ({ col: getColumnSize(), open: getOpenBoxSize() }));
  const [headerSize, setHeaderSize] = useState(null);

  useEffect(() => {
    const onResize = () => setLayout({ col: getColumnSize(), open: getOpenBoxSize() });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  // The collapsed box hugs the header text, which changes with the page and
  // once Inter loads
  useLayoutEffect(() => {
    const el = headerRef.current;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setHeaderSize({ w: Math.ceil(rect.width), h: Math.ceil(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Moving between home and a page always starts the box closed. Hover is
  // ignored while it travels so the pointer it leaves behind can't reopen it.
  useLayoutEffect(() => {
    setIsExpanded(false);
    hoverSuppressedUntilRef.current = performance.now() + HOVER_SUPPRESS_MS;
  }, [isHome]);

  // Clear menu hover once the box closes, since the canvas stops seeing the pointer
  useEffect(() => {
    if (isOpen) return;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
    wakeRef.current();
  }, [isOpen]);

  // Touch screens close the box with a tap anywhere outside it
  useEffect(() => {
    if (!isExpanded) return;
    const closeOnOutsidePress = (e) => {
      if (e.pointerType !== 'mouse' && !boxRef.current?.contains(e.target)) setIsExpanded(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isExpanded]);

  const handlePointerMove = (e) => {
    if (e.pointerType !== 'mouse' || performance.now() < hoverSuppressedUntilRef.current) return;
    clearTimeout(closeTimerRef.current);
    setIsExpanded(true);
    // Real mouse movement over the box hands control back from the keyboard
    // (the box resizing under a still pointer reports no movement)
    if (keyboardRef.current.active && (e.movementX || e.movementY)) {
      keyboardRef.current.active = false;
      setKeyboardActive(false);
    }
  };

  // ── Keyboard navigation ──
  // Arrow keys open the box and move a highlight: up/down within a column,
  // right/Enter to open, left to back out, Escape to close. Text fields, the
  // lightbox and the right-click menu keep their keys.
  useEffect(() => {
    const stopKeyboard = () => {
      keyboardRef.current.active = false;
      setKeyboardActive(false);
      setIsExpanded(false);
    };

    const openItem = (state, kb, item) => {
      if (kb.level === 'main') {
        if (item.type === 'submenu') {
          if (state.expandedSubmenuId !== item.id) state.navigateToSubmenu(item.id);
          kb.level = 'submenu';
          kb.index = 0;
        } else {
          openMainItem(item);
        }
      } else if (kb.level === 'submenu') {
        if (item.type === 'submenu') {
          if (state.expandedNestedSubmenuId !== item.id) state.navigateToNestedSubmenu(item.id);
          kb.level = 'nested';
          kb.index = 0;
        } else {
          state.navigateToSubpage(item.id, state.expandedSubmenuId);
        }
      } else {
        state.navigateToSubpage(item.id, state.expandedSubmenuId, state.expandedNestedSubmenuId);
      }
    };

    const backOut = (state, kb) => {
      if (kb.level === 'nested') {
        const parentIndex = getColumnItems(state, 'submenu').findIndex(s => s.id === state.expandedNestedSubmenuId);
        state.navigateToNestedSubmenu(state.expandedNestedSubmenuId);
        kb.level = 'submenu';
        kb.index = Math.max(0, parentIndex);
      } else if (kb.level === 'submenu') {
        const parentIndex = getColumnItems(state, 'main').findIndex(m => m.id === state.expandedSubmenuId);
        state.closeSubmenu();
        kb.level = 'main';
        kb.index = Math.max(0, parentIndex);
      }
    };

    const onKeyDown = (e) => {
      if (!KEYBOARD_KEYS.has(e.key) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('.lightbox-overlay, .context-menu')) return;
      const state = useNavigationStore.getState();
      const kb = keyboardRef.current;
      // Enter and Escape only act once the arrow keys have taken over
      if (!kb.active && !e.key.startsWith('Arrow')) return;
      e.preventDefault();

      if (!kb.active) {
        // The first press only reveals the highlight, on the current page's item
        const metrics = getMenuMetrics(state);
        const current = metrics.items.findIndex(item => item.id === state.currentView || item.id === state.activeMenuItem);
        keyboardRef.current = { active: true, level: metrics.level, index: Math.max(0, current) };
        setKeyboardActive(true);
        wakeRef.current();
        return;
      }

      // Re-sync if the mouse changed the menu since the last key
      let items = getColumnItems(state, kb.level);
      if (items.length === 0) {
        const metrics = getMenuMetrics(state);
        kb.level = metrics.level;
        kb.index = 0;
        items = metrics.items;
      }
      kb.index = Math.min(kb.index, items.length - 1);

      if (e.key === 'ArrowDown') kb.index = Math.min(kb.index + 1, items.length - 1);
      else if (e.key === 'ArrowUp') kb.index = Math.max(kb.index - 1, 0);
      else if (e.key === 'ArrowRight' || e.key === 'Enter') openItem(state, kb, items[kb.index]);
      else if (e.key === 'ArrowLeft') backOut(state, kb);
      else if (e.key === 'Escape') stopKeyboard();
      wakeRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // A click outside the box ends keyboard navigation
  useEffect(() => {
    if (!keyboardActive) return;
    const onPointerDown = (e) => {
      if (boxRef.current?.contains(e.target)) return;
      keyboardRef.current.active = false;
      setKeyboardActive(false);
      setIsExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [keyboardActive]);

  const handlePointerLeave = (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsExpanded(false), HOVER_CLOSE_DELAY_MS);
  };

  const handlePointerDown = (e) => {
    openAtPressRef.current = isOpen;
    if (e.pointerType !== 'mouse') setIsExpanded(true);
  };

  // The name leads home, but on touch the first tap only opens the box
  const handleNameClick = () => {
    if (openAtPressRef.current && !isHome) navigateToHome();
  };

  const showOutsideBack = canGoBack && !isOpen && Boolean(headerSize);

  let boxStyle;
  if (isOpen) {
    boxStyle = {
      top: isHome ? (layout.col.h - menuHeight) / 2 : BOX_MARGIN,
      width: layout.open.w,
      height: menuHeight,
    };
  } else if (headerSize) {
    boxStyle = {
      top: BOX_MARGIN,
      // Never wider than the open box, so it stays inside the column on narrow windows
      width: Math.min(headerSize.w + BOX_INSET + BOX_PAD_RIGHT, layout.open.w),
      height: headerSize.h + BOX_PAD_Y * 2,
    };
  }

  return (
    <>
      <div ref={containerRef} className="p5-menu-container" />
      {/* Under the collapsed box; fades out while the box is open, which has its
          own back button. Before the box in the DOM so the opening box covers it. */}
      <button
        type="button"
        className={`icon-button nav-back-outside${showOutsideBack ? ' is-visible' : ''}`}
        style={headerSize ? { top: BOX_MARGIN + headerSize.h + BOX_PAD_Y * 2 + OUTSIDE_BACK_GAP } : undefined}
        onClick={goBack}
        aria-label="Back"
        tabIndex={showOutsideBack ? 0 : -1}
      >
        <BackArrowIcon />
      </button>
      <nav
        ref={boxRef}
        // Transitions start once the header is measured, so the box doesn't
        // animate in from an unmeasured size
        className={`nav-box${isOpen ? ' is-open' : ''}${headerSize ? ' is-animated' : ''}`}
        style={boxStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div ref={menuHostRef} className="nav-box-menu" />
        <div ref={headerRef} className="nav-box-header">
          <button type="button" className="nav-box-name" onClick={handleNameClick}>
            {navigationData.home.content.name}
          </button>
          {currentTitle && <div className="nav-box-current">{currentTitle}</div>}
        </div>
        <button
          type="button"
          className={`icon-button nav-box-back${canGoBack ? ' is-visible' : ''}`}
          onClick={goBack}
          aria-label="Back"
          tabIndex={canGoBack && isOpen ? 0 : -1}
        >
          <BackArrowIcon />
        </button>
      </nav>
    </>
  );
}

export default P5Menu;
