import { useEffect, useRef, useState, useCallback } from 'react';
import p5 from 'p5';
import { navigationData } from '../data/navigation';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes, theme } from '../config/theme';
import './P5Menu.css';

const MAX_RETRIES = 3;
const HEALTH_CHECK_DELAY = 2000; // ms after init to verify canvas is alive
const HEARTBEAT_STALE_MS = 1000; // if no draw frame for this long, consider dead

function P5Menu() {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const retryCountRef = useRef(0);
  const healthTimerRef = useRef(null);
  const lastDrawTimeRef = useRef(0); // timestamp of last draw() call
  const initIdRef = useRef(0); // guard against stale health checks

  // Teardown helper
  const destroyInstance = useCallback(() => {
    if (healthTimerRef.current) {
      clearTimeout(healthTimerRef.current);
      healthTimerRef.current = null;
    }
    if (p5InstanceRef.current) {
      try { p5InstanceRef.current.remove(); } catch (_) { /* already removed */ }
      p5InstanceRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  // Initialise (or re-initialise) the p5 sketch
  const initSketch = useCallback(() => {
    if (!containerRef.current) return;
    destroyInstance();

    const thisInitId = ++initIdRef.current;
    lastDrawTimeRef.current = 0;

    const sketch = (p) => {
      let font = null;
      let fontLoaded = false;
      const isMobile = () => window.innerWidth <= 768;

      // ── Animation state ──
      // Each item gets its own animated properties for smooth transitions
      const animState = {
        // Main menu items: { x, y, opacity, targetX, targetY, targetOpacity }
        mainItems: [],
        // Submenu items
        subItems: [],
        // Submenu animation timing
        subAnimStartTime: 0,
        subAnimDirection: 0, // 1 = appearing, -1 = disappearing, 0 = idle
        prevExpandedSubmenuIdForAnim: null,
        // Back button
        backButton: { scale: 0, targetScale: 0, x: 0, y: 0, targetX: 0, targetY: 0 },
        // Wires (time-based)
        submenuWireStartTime: 0,
        submenuWireDirection: 0, // 1 = drawing on, -1 = drawing off
        submenuWireVisible: false,
        submenuWireEndpoints: null, // cached {x1,y1,x2,y2} for undraw
        pageWireStartTime: 0,
        pageWireDirection: 0,
        pageWireVisible: false,
        pageWireEndpoints: null, // cached {x1,y1,x2,y2} for undraw
        // Camera offset (simulates the pan when submenu opens)
        cameraX: 0,
        targetCameraX: 0,
        // Background dots
        dotPositions: [],
        dotBasePositions: [],
        // Previous state tracking for wire animations
        prevExpandedSubmenuId: null,
        prevActiveMenuItem: null,
        prevCurrentView: null,
        // Page wire source item
        pageWireItem: null,
      };

      // ── Layout calculations ──
      function getLeftColumnWidth() {
        // Canvas IS the left column now, so right edge = canvas width
        return p.width;
      }

      function getMenuX() {
        // Center the menu text block within the canvas
        if (isMobile()) return p.width / 2 - 30;
        return p.width / 2 - 40;
      }

      function getMenuPositionPx(menuLevel, itemIndex, itemCount) {
        const spacing = isMobile() ? 20 : 25;
        const totalHeight = (itemCount - 1) * spacing;
        const centerY = p.height / 2;
        const startY = centerY - totalHeight / 2;

        const depthSep = isMobile()
          ? theme.spatial.menuDepthSeparation * 25
          : theme.spatial.menuDepthSeparation * 50;

        let x;
        switch (menuLevel) {
          case 'main':
            x = getMenuX();
            break;
          case 'submenu':
            x = getMenuX() + depthSep;
            break;
          default:
            x = getMenuX();
        }

        return { x, y: startY + itemIndex * spacing };
      }


      // ── Background dots ──
      function initDots() {
        const gridSize = isMobile() ? 30 : 50;
        const spacingPx = isMobile() ? 20 : 40;
        animState.dotPositions = [];
        animState.dotBasePositions = [];

        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            const bx = i * spacingPx;
            const by = j * spacingPx;
            animState.dotBasePositions.push({ x: bx, y: by });
            animState.dotPositions.push({ x: bx, y: by });
          }
        }
      }

      function updateDots() {
        const hoverRadius = isMobile() ? 60 : 100;
        const hoverStrength = isMobile() ? 15 : 25;
        const lerpFactor = 0.08;

        for (let i = 0; i < animState.dotBasePositions.length; i++) {
          const base = animState.dotBasePositions[i];
          const dot = animState.dotPositions[i];
          const dx = base.x - p.mouseX;
          const dy = base.y - p.mouseY;
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
      }

      function drawDots(dotColor) {
        p.noStroke();
        p.fill(dotColor);
        const r = isMobile() ? 1.2 : 1.0;
        for (let i = 0; i < animState.dotPositions.length; i++) {
          const dot = animState.dotPositions[i];
          p.ellipse(dot.x, dot.y, r, r);
        }
      }

      // ── Easing ──
      function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      }

      // ── Bezier wire drawing ──
      function drawBezierWire(x1, y1, x2, y2, progress, wireColor, wireOpacity, lineW) {
        if (progress <= 0) return;
        p.stroke(wireColor);
        p.strokeWeight(lineW || 1);
        p.noFill();

        // Control points for a smooth S-curve
        const dx = x2 - x1;
        const cp1x = x1 + dx * 0.6;
        const cp1y = y1;
        const cp2x = x1 + dx * 0.4;
        const cp2y = y2;

        // Draw the bezier up to 'progress'
        const steps = 40;
        const end = Math.floor(steps * Math.min(progress, 1));
        
        // Set opacity through stroke color with alpha
        const c = p.color(wireColor);
        c.setAlpha(wireOpacity * 255);
        p.stroke(c);

        p.beginShape();
        p.noFill();
        for (let i = 0; i <= end; i++) {
          const t = i / steps;
          const px = p.bezierPoint(x1, cp1x, cp2x, x2, t);
          const py = p.bezierPoint(y1, cp1y, cp2y, y2, t);
          p.vertex(px, py);
        }
        p.endShape();

        // Draw arrow chevrons at 1/3 and 2/3 if fully drawn (hidden for now)
        // if (progress >= 0.95) {
        //   drawArrowChevron(x1, cp1x, cp2x, x2, y1, cp1y, cp2y, y2, 1 / 3, c, lineW);
        //   drawArrowChevron(x1, cp1x, cp2x, x2, y1, cp1y, cp2y, y2, 2 / 3, c, lineW);
        // }
      }

      function drawArrowChevron(x1, cp1x, cp2x, x2, y1, cp1y, cp2y, y2, t, col, lineW) {
        const px = p.bezierPoint(x1, cp1x, cp2x, x2, t);
        const py = p.bezierPoint(y1, cp1y, cp2y, y2, t);
        // Tangent
        const tx = p.bezierTangent(x1, cp1x, cp2x, x2, t);
        const ty = p.bezierTangent(y1, cp1y, cp2y, y2, t);
        // Angle pointing back toward origin
        const angle = Math.atan2(-ty, -tx);
        const armLen = isMobile() ? 4 : 6;
        const armAngle = Math.PI / 6;

        p.stroke(col);
        p.strokeWeight(lineW || 1);
        p.line(
          px + Math.cos(angle + armAngle) * armLen,
          py + Math.sin(angle + armAngle) * armLen,
          px, py
        );
        p.line(
          px + Math.cos(angle - armAngle) * armLen,
          py + Math.sin(angle - armAngle) * armLen,
          px, py
        );
      }

      // ── Back button ──
      function drawBackButton(x, y, scale, col, hovered) {
        if (scale < 0.01) return;
        p.push();
        p.translate(x, y);
        p.scale(scale);
        const opacity = hovered ? 255 : 150;
        const c = p.color(col);
        c.setAlpha(opacity);
        p.stroke(c);
        p.strokeWeight(1.5);
        p.noFill();
        // Diagonal arrow pointing to upper-left corner (matches ReturnArrow)
        const size = 4;
        // Diagonal line from bottom-right to top-left
        p.line(size, size, -size, -size);
        // Arrowhead: horizontal arm and vertical arm at the top-left
        p.line(-size, size * 0.6, -size, -size);
        p.line(size * 0.6, -size, -size, -size);
        p.pop();
      }

      // ── Hit testing ──
      function isPointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry - rh / 2 && py <= ry + rh / 2;
      }

      // ── Main sketch ──
      // ── Canvas sizing helpers ──
      function getCanvasWidth() {
        if (isMobile()) return window.innerWidth;
        return Math.floor(window.innerWidth * theme.layout.leftColumnRatio);
      }
      function getCanvasHeight() {
        if (isMobile()) return Math.floor(window.innerHeight * 0.35);
        return window.innerHeight;
      }

      p.setup = () => {
        const canvas = p.createCanvas(getCanvasWidth(), getCanvasHeight());
        canvas.style('display', 'block');
        p.textFont('Inter');
        p.textSize(isMobile() ? 16 : 20);
        p.textAlign(p.LEFT, p.CENTER);
        p.textStyle(p.BOLD);

        // Try loading the bold font file for better rendering
        p.loadFont('/font/Inter_Bold.ttf', (f) => {
          font = f;
          fontLoaded = true;
          p.textFont(font);
        }, () => {
          // Fallback: use CSS font
          console.warn('[P5Menu] Font file failed, using CSS fallback');
          fontLoaded = true;
        });

        // Initialize animation state for menu items
        const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
        for (let i = 0; i < mainMenu.length; i++) {
          const pos = getMenuPositionPx('main', i, mainMenu.length);
          animState.mainItems.push({
            x: pos.x, y: pos.y,
            targetX: pos.x, targetY: pos.y,
            opacity: 0.5, targetOpacity: 0.5
          });
        }

        initDots();
      };

      p.windowResized = () => {
        p.resizeCanvas(getCanvasWidth(), getCanvasHeight());
        initDots();
        // Recalculate positions
        const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
        for (let i = 0; i < mainMenu.length; i++) {
          const pos = getMenuPositionPx('main', i, mainMenu.length);
          animState.mainItems[i].targetX = pos.x;
          animState.mainItems[i].targetY = pos.y;
        }
      };

      p.draw = () => {
        if (!fontLoaded) return;
        // Heartbeat – stamp the time so health-check knows we're alive
        lastDrawTimeRef.current = Date.now();

        // ── Read store state ──
        const state = useNavigationStore.getState();
        const {
          currentView, activeMenuItem, expandedSubmenuId,
          currentTheme, isThemeInverted, isHoveringMenuItem
        } = state;
        const activeColors = colorThemes[currentTheme];

        const bgColor = isThemeInverted ? activeColors.text : activeColors.background;
        const textColor = isThemeInverted ? activeColors.background : activeColors.text;
        const wireColor = isThemeInverted ? activeColors.background : activeColors.wire;

        // ── Clear ──
        p.background(bgColor);

        // ── Background dots ──
        if (!isMobile()) {
          updateDots();
          drawDots(textColor);
        }

        // ── Menu layout ──
        const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
        const fontSize = isMobile() ? 16 : 20;
        p.textSize(fontSize);
        p.textStyle(p.BOLD);
        if (font) p.textFont(font);

        // ── Camera offset for submenu ──
        // Calculate pan so submenu items are centered in the canvas
        if (expandedSubmenuId) {
          const depthSep = isMobile()
            ? theme.spatial.menuDepthSeparation * 25
            : theme.spatial.menuDepthSeparation * 50;
          const submenuX = getMenuX() + depthSep;
          // Estimate average text width of submenu items for better centering
          let avgTextW = 0;
          const ep = mainMenu.find(m => m.id === expandedSubmenuId);
          if (ep && ep.submenu) {
            for (let i = 0; i < ep.submenu.length; i++) {
              avgTextW += p.textWidth(ep.submenu[i].title);
            }
            avgTextW /= ep.submenu.length;
          }
          const submenuCenter = submenuX + avgTextW / 2;
          const canvasCenter = p.width / 2;
          animState.targetCameraX = canvasCenter - submenuCenter;
        } else {
          animState.targetCameraX = 0;
        }
        animState.cameraX += (animState.targetCameraX - animState.cameraX) * 0.06;
        p.push();
        p.translate(animState.cameraX, 0);

        // ── Recalculate target positions ──
        for (let i = 0; i < mainMenu.length; i++) {
          const pos = getMenuPositionPx('main', i, mainMenu.length);
          animState.mainItems[i].targetX = pos.x;
          animState.mainItems[i].targetY = pos.y;

          const isActive = activeMenuItem === mainMenu[i].id || expandedSubmenuId === mainMenu[i].id;
          const isHov = isPointInRect(
            p.mouseX - animState.cameraX, p.mouseY,
            animState.mainItems[i].x - 5, animState.mainItems[i].y,
            p.textWidth(mainMenu[i].title) + 10, fontSize + 8
          );
          animState.mainItems[i].targetOpacity = isActive ? 1 : isHov ? 1 : 0.5;
        }

        // ── Lerp main menu items ──
        for (let i = 0; i < animState.mainItems.length; i++) {
          const item = animState.mainItems[i];
          item.x += (item.targetX - item.x) * 0.1;
          item.y += (item.targetY - item.y) * 0.1;
          item.opacity += (item.targetOpacity - item.opacity) * 0.15;
        }

        // ── Submenu items ──
        const expandedParent = expandedSubmenuId
          ? mainMenu.find(m => m.id === expandedSubmenuId)
          : null;
        const submenuData = expandedParent?.submenu || [];

        // Ensure animState.subItems has the right length
        while (animState.subItems.length < submenuData.length) {
          const idx = animState.subItems.length;
          const pos = getMenuPositionPx('submenu', idx, submenuData.length);
          animState.subItems.push({
            x: pos.x, y: pos.y + 30,
            targetX: pos.x, targetY: pos.y,
            opacity: 0, targetOpacity: 0.5,
          });
        }

        // Detect submenu open/close transitions
        if (expandedSubmenuId && !animState.prevExpandedSubmenuIdForAnim) {
          // Just opened — start appear animation
          animState.subAnimStartTime = p.millis();
          animState.subAnimDirection = 1;
        } else if (!expandedSubmenuId && animState.prevExpandedSubmenuIdForAnim) {
          // Just closed — start disappear animation
          animState.subAnimStartTime = p.millis();
          animState.subAnimDirection = -1;
        }
        animState.prevExpandedSubmenuIdForAnim = expandedSubmenuId;

        // Time-based animation params
        const subAnimDuration = 400; // ms total for full animation
        const subAnimStagger = 60;   // ms stagger between each item
        const subSlideOffset = 25;   // px vertical slide distance
        const elapsed = p.millis() - animState.subAnimStartTime;

        for (let i = 0; i < submenuData.length; i++) {
          const pos = getMenuPositionPx('submenu', i, submenuData.length);
          animState.subItems[i].targetX = pos.x;
          animState.subItems[i].targetY = pos.y;

          if (expandedSubmenuId) {
            const isActive = activeMenuItem === submenuData[i].id;
            const isHov = isPointInRect(
              p.mouseX - animState.cameraX, p.mouseY,
              animState.subItems[i].x - 5, animState.subItems[i].y,
              p.textWidth(submenuData[i].title) + 10, fontSize + 8
            );
            animState.subItems[i].targetOpacity = isActive ? 1 : isHov ? 1 : 0.5;
          } else {
            animState.subItems[i].targetOpacity = 0;
          }
        }

        for (let i = 0; i < animState.subItems.length; i++) {
          const item = animState.subItems[i];
          
          // Calculate per-item progress based on time and stagger
          const itemDelay = i * subAnimStagger;
          let t;
          if (animState.subAnimDirection === 1) {
            // Appearing
            t = Math.max(0, Math.min(1, (elapsed - itemDelay) / subAnimDuration));
          } else if (animState.subAnimDirection === -1) {
            // Disappearing (reverse stagger — last items disappear first)
            const reverseDelay = (animState.subItems.length - 1 - i) * subAnimStagger;
            t = 1 - Math.max(0, Math.min(1, (elapsed - reverseDelay) / subAnimDuration));
          } else {
            t = expandedSubmenuId ? 1 : 0;
          }
          
          // Apply easeOutCubic for snappy, visible animation
          const eased = 1 - Math.pow(1 - t, 3);
          
          // Position: slide up from offset
          item.x += (item.targetX - item.x) * 0.15;
          item.y = item.targetY + subSlideOffset * (1 - eased);
          item.opacity = item.targetOpacity * eased;
        }

        // Clean up faded submenu items (only after wire out-animation is also done)
        const wireStillAnimating = animState.submenuWireDirection !== 0 || animState.pageWireDirection !== 0;
        if (!expandedSubmenuId && !wireStillAnimating && animState.subItems.every(s => s.opacity < 0.01)) {
          animState.subItems = [];
          animState.subAnimDirection = 0;
        }

        // ── Wire: Parent → Submenu ──
        const subWireDuration = 500; // ms
        if (expandedSubmenuId && !animState.submenuWireVisible) {
          animState.submenuWireStartTime = p.millis();
          animState.submenuWireDirection = 1;
          animState.submenuWireVisible = true;
          animState.submenuWireEndpoints = null; // will be computed live
        } else if (!expandedSubmenuId && animState.submenuWireVisible) {
          // Cache current wire endpoints before they become unavailable
          const closingParentId = animState.prevExpandedSubmenuId || expandedSubmenuId;
          const closingParentIdx = mainMenu.findIndex(m => m.id === closingParentId);
          if (closingParentIdx !== -1 && animState.subItems.length > 0) {
            const pi = animState.mainItems[closingParentIdx];
            const ptw = p.textWidth(mainMenu[closingParentIdx].title);
            const scy = (animState.subItems[0].y + animState.subItems[animState.subItems.length - 1].y) / 2;
            const slx = animState.subItems[0].x - 10;
            animState.submenuWireEndpoints = {
              x1: pi.x + ptw + 8, y1: pi.y,
              x2: slx, y2: scy
            };
          }
          animState.submenuWireStartTime = p.millis();
          animState.submenuWireDirection = -1;
          animState.submenuWireVisible = false;
        }

        let submenuWireT = 0;
        if (animState.submenuWireDirection !== 0) {
          const wElapsed = p.millis() - animState.submenuWireStartTime;
          const raw = Math.max(0, Math.min(1, wElapsed / subWireDuration));
          const eased = easeInOutCubic(raw);
          if (animState.submenuWireDirection === 1) {
            submenuWireT = eased;
          } else {
            submenuWireT = 1 - eased;
          }
          // Stop animating once fully done
          if (raw >= 1) {
            animState.submenuWireDirection = 0;
            animState.submenuWireEndpoints = null;
          }
        } else {
          submenuWireT = expandedSubmenuId ? 1 : 0;
        }

        if (submenuWireT > 0.01) {
          // Use cached endpoints during undraw, compute live during draw-on
          let wireX1, wireY1, wireX2, wireY2;
          if (animState.submenuWireEndpoints) {
            wireX1 = animState.submenuWireEndpoints.x1;
            wireY1 = animState.submenuWireEndpoints.y1;
            wireX2 = animState.submenuWireEndpoints.x2;
            wireY2 = animState.submenuWireEndpoints.y2;
          } else if (expandedParent) {
            const parentIdx = mainMenu.findIndex(m => m.id === expandedSubmenuId);
            if (parentIdx !== -1 && animState.subItems.length > 0) {
              const parentItem = animState.mainItems[parentIdx];
              wireX1 = parentItem.x + p.textWidth(mainMenu[parentIdx].title) + 8;
              wireY1 = parentItem.y;
              wireY2 = (animState.subItems[0].y + animState.subItems[animState.subItems.length - 1].y) / 2;
              wireX2 = animState.subItems[0].x - 10;
            }
          }
          if (wireX1 !== undefined) {
            drawBezierWire(wireX1, wireY1, wireX2, wireY2, submenuWireT, wireColor, 0.6, 1);
          }
        }

        // ── Wire: Active item → Content area edge ──
        const pageWireDuration = 500; // ms
        const shouldShowPageWire = currentView && currentView !== 'home' && activeMenuItem;
        if (shouldShowPageWire && animState.prevActiveMenuItem !== activeMenuItem) {
          animState.pageWireItem = activeMenuItem;
          animState.pageWireStartTime = p.millis();
          animState.pageWireDirection = 1;
          animState.pageWireEndpoints = null;
        }
        if (shouldShowPageWire && !animState.pageWireVisible) {
          animState.pageWireStartTime = p.millis();
          animState.pageWireDirection = 1;
          animState.pageWireVisible = true;
          animState.pageWireEndpoints = null;
        } else if (!shouldShowPageWire && animState.pageWireVisible) {
          // Cache current wire endpoints before they become unavailable
          if (animState.pageWireItem) {
            let ix = 0, iy = 0, itw = 0;
            const mi = mainMenu.findIndex(m => m.id === animState.pageWireItem);
            if (mi !== -1) {
              ix = animState.mainItems[mi].x;
              iy = animState.mainItems[mi].y;
              itw = p.textWidth(mainMenu[mi].title);
            } else if (expandedParent) {
              const si = submenuData.findIndex(s => s.id === animState.pageWireItem);
              if (si !== -1 && animState.subItems[si]) {
                ix = animState.subItems[si].x;
                iy = animState.subItems[si].y;
                itw = p.textWidth(submenuData[si].title);
              }
            }
            if (itw > 0) {
              const cle = getLeftColumnWidth() - animState.cameraX;
              animState.pageWireEndpoints = {
                x1: ix + itw + 8, y1: iy,
                x2: cle, y2: iy - 40
              };
            }
          }
          animState.pageWireStartTime = p.millis();
          animState.pageWireDirection = -1;
          animState.pageWireVisible = false;
        }

        let pageWireT = 0;
        if (animState.pageWireDirection !== 0) {
          const pElapsed = p.millis() - animState.pageWireStartTime;
          const raw = Math.max(0, Math.min(1, pElapsed / pageWireDuration));
          const eased = easeInOutCubic(raw);
          if (animState.pageWireDirection === 1) {
            pageWireT = eased;
          } else {
            pageWireT = 1 - eased;
          }
          if (raw >= 1) {
            animState.pageWireDirection = 0;
            animState.pageWireEndpoints = null;
            if (!shouldShowPageWire) {
              animState.pageWireItem = activeMenuItem;
            }
          }
        } else {
          pageWireT = shouldShowPageWire ? 1 : 0;
          if (!shouldShowPageWire) animState.pageWireItem = activeMenuItem;
        }

        if (pageWireT > 0.01 && !isMobile()) {
          let pwX1, pwY1, pwX2, pwY2;
          if (animState.pageWireEndpoints) {
            // Use cached endpoints during undraw
            pwX1 = animState.pageWireEndpoints.x1;
            pwY1 = animState.pageWireEndpoints.y1;
            pwX2 = animState.pageWireEndpoints.x2;
            pwY2 = animState.pageWireEndpoints.y2;
          } else if (animState.pageWireItem) {
            // Compute live during draw-on
            const mi = mainMenu.findIndex(m => m.id === animState.pageWireItem);
            if (mi !== -1) {
              pwX1 = animState.mainItems[mi].x + p.textWidth(mainMenu[mi].title) + 8;
              pwY1 = animState.mainItems[mi].y;
            } else if (expandedParent) {
              const si = submenuData.findIndex(s => s.id === animState.pageWireItem);
              if (si !== -1 && animState.subItems[si]) {
                pwX1 = animState.subItems[si].x + p.textWidth(submenuData[si].title) + 8;
                pwY1 = animState.subItems[si].y;
              }
            }
            if (pwX1 !== undefined) {
              pwX2 = getLeftColumnWidth() - animState.cameraX;
              pwY2 = pwY1 - 40;
            }
          }
          if (pwX1 !== undefined) {
            drawBezierWire(pwX1, pwY1, pwX2, pwY2, pageWireT, wireColor, 0.4, 1);
          }
        }
        animState.prevActiveMenuItem = activeMenuItem;
        animState.prevExpandedSubmenuId = expandedSubmenuId;
        animState.prevCurrentView = currentView;

        // ── Draw main menu items ──
        for (let i = 0; i < mainMenu.length; i++) {
          const item = animState.mainItems[i];
          const c = p.color(textColor);
          c.setAlpha(item.opacity * 255);
          p.fill(c);
          p.noStroke();
          p.text(mainMenu[i].title, item.x, item.y);
        }

        // ── Draw submenu items ──
        for (let i = 0; i < submenuData.length; i++) {
          if (i >= animState.subItems.length) break;
          const item = animState.subItems[i];
          if (item.opacity < 0.01) continue;
          const c = p.color(textColor);
          c.setAlpha(item.opacity * 255);
          p.fill(c);
          p.noStroke();
          p.text(submenuData[i].title, item.x, item.y);
        }

        // ── Back button ──
        const canGoBack = state.canGoBack();
        animState.backButton.targetScale = canGoBack ? 1 : 0;
        animState.backButton.scale += (animState.backButton.targetScale - animState.backButton.scale) * 0.12;

        if (animState.backButton.scale > 0.01) {
          // Position above whichever menu is active
          let bx, by;
          if (expandedSubmenuId && animState.subItems.length > 0) {
            bx = animState.subItems[0].x + 4;
            by = animState.subItems[0].y - 30;
          } else if (animState.mainItems.length > 0) {
            bx = animState.mainItems[0].x + 4;
            by = animState.mainItems[0].y - 30;
          } else {
            bx = getMenuX() + 4;
            by = 80;
          }
          animState.backButton.targetX = bx;
          animState.backButton.targetY = by;
          animState.backButton.x += (animState.backButton.targetX - animState.backButton.x) * 0.1;
          animState.backButton.y += (animState.backButton.targetY - animState.backButton.y) * 0.1;

          const backHovered = isPointInRect(
            p.mouseX - animState.cameraX, p.mouseY,
            animState.backButton.x - 12, animState.backButton.y,
            24, 20
          );
          drawBackButton(
            animState.backButton.x, animState.backButton.y,
            animState.backButton.scale, textColor, backHovered
          );
        }

        p.pop(); // End camera offset

        // ── Cursor ──
        // Set cursor based on hover state
        const mx = p.mouseX - animState.cameraX;
        const my = p.mouseY;
        let isHovering = false;

        // Check main items
        for (let i = 0; i < mainMenu.length; i++) {
          const item = animState.mainItems[i];
          if (isPointInRect(mx, my, item.x - 5, item.y, p.textWidth(mainMenu[i].title) + 10, fontSize + 8)) {
            isHovering = true;
          }
        }
        // Check sub items
        for (let i = 0; i < submenuData.length; i++) {
          if (i >= animState.subItems.length) break;
          const item = animState.subItems[i];
          if (item.opacity > 0.1 && isPointInRect(mx, my, item.x - 5, item.y, p.textWidth(submenuData[i].title) + 10, fontSize + 8)) {
            isHovering = true;
          }
        }
        // Check back button
        if (animState.backButton.scale > 0.3) {
          if (isPointInRect(mx, my, animState.backButton.x - 12, animState.backButton.y, 24, 20)) {
            isHovering = true;
          }
        }
        // Update global store hover state
        useNavigationStore.getState().setHoveringMenuItem(isHovering);
      };

      // ── Mouse handling ──
      p.mousePressed = () => {
        const state = useNavigationStore.getState();
        const mx = p.mouseX - animState.cameraX;
        const my = p.mouseY;
        const fontSize = isMobile() ? 16 : 20;
        const mainMenu = navigationData.mainMenu.filter(m => !m.hidden);
        const expandedParent = state.expandedSubmenuId
          ? mainMenu.find(m => m.id === state.expandedSubmenuId)
          : null;
        const submenuData = expandedParent?.submenu || [];

        // Check back button
        if (animState.backButton.scale > 0.3) {
          if (isPointInRect(mx, my, animState.backButton.x - 12, animState.backButton.y, 24, 20)) {
            state.goBack();
            return;
          }
        }

        // Check main menu items
        for (let i = 0; i < mainMenu.length; i++) {
          const item = animState.mainItems[i];
          if (isPointInRect(mx, my, item.x - 5, item.y, p.textWidth(mainMenu[i].title) + 10, fontSize + 8)) {
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

        // Check submenu items
        for (let i = 0; i < submenuData.length; i++) {
          if (i >= animState.subItems.length) break;
          const item = animState.subItems[i];
          if (item.opacity > 0.1 && isPointInRect(mx, my, item.x - 5, item.y, p.textWidth(submenuData[i].title) + 10, fontSize + 8)) {
            const subItem = submenuData[i];
            if (subItem.type === 'page') {
              state.navigateToSubpage(subItem.id, state.expandedSubmenuId);
            } else if (subItem.type === 'submenu') {
              state.navigateToSubmenu(subItem.id);
            }
            return;
          }
        }

      };
    };

    p5InstanceRef.current = new p5(sketch, containerRef.current);

    // ── Health check: verify the canvas is alive & draw loop is running ──
    healthTimerRef.current = setTimeout(() => {
      if (thisInitId !== initIdRef.current) return; // stale

      const canvasEl = containerRef.current?.querySelector('canvas');
      const drawIsRunning = lastDrawTimeRef.current > 0 &&
        (Date.now() - lastDrawTimeRef.current) < HEARTBEAT_STALE_MS;

      if (!canvasEl || !drawIsRunning) {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.warn(
            `[P5Menu] Canvas health-check failed (attempt ${retryCountRef.current}/${MAX_RETRIES}). ` +
            `canvas=${!!canvasEl}, drawAlive=${drawIsRunning}. Retrying…`
          );
          initSketch();
        } else {
          console.error('[P5Menu] Canvas failed to initialise after ' + MAX_RETRIES + ' retries.');
        }
      } else {
        // Success – reset retry counter for any future re-mounts
        retryCountRef.current = 0;
      }
    }, HEALTH_CHECK_DELAY);
  }, [destroyInstance]);

  // Kick off on mount
  useEffect(() => {
    retryCountRef.current = 0;
    initSketch();
    return () => destroyInstance();
  }, [initSketch, destroyInstance]);

  return (
    <div ref={containerRef} className="p5-menu-container" />
  );
}

export default P5Menu;
