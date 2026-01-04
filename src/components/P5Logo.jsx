import { useEffect, useRef } from 'react';
import p5 from 'p5';
import { useNavigationStore } from '../store/navigationStore';

// Preload Inter Bold font using FontFace API
let fontPreloaded = false;
let fontPreloadPromise = null;
let cachedP5Font = null;

const preloadFont = () => {
  if (fontPreloadPromise) return fontPreloadPromise;
  
  fontPreloadPromise = new Promise((resolve) => {
    // Check if font is already loaded via CSS
    if (document.fonts.check('bold 16px "Inter Bold"') || document.fonts.check('16px Inter-Bold')) {
      fontPreloaded = true;
      resolve(true);
      return;
    }

    // Try to load the font
    const font = new FontFace('Inter Bold', 'url(/font/Inter_Bold.ttf)');
    
    // Set a timeout - reduced to 1s for faster fallback
    const timeout = setTimeout(() => {
      console.warn('Font preload timeout, proceeding anyway');
      fontPreloaded = true; // Mark as done so we don't block
      resolve(false);
    }, 1000);

    font.load().then((loadedFont) => {
      clearTimeout(timeout);
      document.fonts.add(loadedFont);
      fontPreloaded = true;
      resolve(true);
    }).catch((err) => {
      clearTimeout(timeout);
      console.warn('Font preload failed:', err);
      fontPreloaded = true; // Mark as done so we don't block
      resolve(false);
    });
  });

  return fontPreloadPromise;
};

// Start preloading immediately when module loads
preloadFont();

function P5Logo({ text = 'Henry Allan', fontSize = 16 }) {
  const containerRef = useRef(null);
  const p5InstanceRef = useRef(null);
  const setIsHoveringLogo = useNavigationStore(state => state.setIsHoveringLogo);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // If instance already exists, remove it first
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    // Clear container
    containerRef.current.innerHTML = '';

    const sketch = (p) => {
      let font = null;
      let fontLoaded = false;
      let letters = [];
      let shards = [];
      let textStartX = 20;
      let textStartY = 20 + fontSize;
      const hoverRadius = 30;

      // Shard class for fractured letter pieces
      class Shard {
        constructor(graphic, points, centerX, centerY, clickX, clickY) {
          this.graphic = graphic;
          this.points = points; // Array of {x, y} relative to graphic
          this.x = centerX;
          this.y = centerY;
          this.rotation = 0;
          
          // Calculate velocity away from click point
          const angle = p.atan2(centerY - clickY, centerX - clickX);
          const speed = p.random(2, 5);
          this.velX = p.cos(angle) * speed + p.random(-1, 1);
          this.velY = p.sin(angle) * speed + p.random(-2, 0);
          this.velRotation = p.random(-0.15, 0.15);
          
          this.gravity = 0.08;
          this.opacity = 255;
          this.fadeSpeed = p.random(1.5, 3);
          this.dead = false;
        }

        update() {
          this.velY += this.gravity;
          this.x += this.velX;
          this.y += this.velY;
          this.rotation += this.velRotation;
          
          // Dampen
          this.velX *= 0.99;
          this.velRotation *= 0.98;
          
          // Fade out
          this.opacity -= this.fadeSpeed;
          if (this.opacity <= 0) {
            this.dead = true;
          }
        }

        draw() {
          if (this.dead) return;
          
          p.push();
          p.translate(this.x, this.y);
          p.rotate(this.rotation);
          
          // Create clipping mask and draw
          p.drawingContext.save();
          p.drawingContext.beginPath();
          for (let i = 0; i < this.points.length; i++) {
            const pt = this.points[i];
            if (i === 0) {
              p.drawingContext.moveTo(pt.x, pt.y);
            } else {
              p.drawingContext.lineTo(pt.x, pt.y);
            }
          }
          p.drawingContext.closePath();
          p.drawingContext.clip();
          
          p.tint(255, this.opacity);
          p.image(this.graphic, -this.graphic.width / 2, -this.graphic.height / 2);
          p.drawingContext.restore();
          
          p.pop();
        }
      }

      class Letter {
        constructor(char, x, y) {
          this.char = char;
          this.baseX = x;
          this.baseY = y;
          this.targetX = x;
          this.targetY = y;
          this.targetRotation = 0;
          this.x = x;
          this.y = y;
          this.rotation = 0;
          this.width = 0;
          this.height = fontSize * 1.2;
          this.isHovering = false;
          this.velX = 0;
          this.velY = 0;
          this.velRotation = 0;
          this.driftDirX = 0;
          this.driftDirY = 0;
          this.driftDirRotation = 0;
          this.hoverTime = 0;
          this.shattered = false;
          this.respawnTimer = 0;
          this.opacity = 255;
          this.respawning = false;
        }

        setDriftDirection() {
          this.driftDirX = p.random(-1, 1);
          this.driftDirY = p.random(-1, 1);
          this.driftDirRotation = p.random(-1, 1);
          this.hoverTime = 0;
        }

        checkHover(mx, my) {
          if (this.shattered) return;
          
          const centerX = this.x + this.width / 2;
          const centerY = this.y;
          const dist = p.dist(mx, my, centerX, centerY);
          
          const wasHovering = this.isHovering;
          this.isHovering = dist < hoverRadius;
          
          if (this.isHovering && !wasHovering) {
            this.setDriftDirection();
            this.velX = this.driftDirX * 1.2;
            this.velY = this.driftDirY * 0.8;
            this.velRotation = this.driftDirRotation * 0.03;
          }
        }

        checkClick(mx, my) {
          if (this.shattered) return false;
          
          // Check if click is within letter bounds
          const padding = 5;
          const inX = mx >= this.x - padding && mx <= this.x + this.width + padding;
          const inY = my >= this.y - this.height && my <= this.y + padding;
          
          return inX && inY;
        }

        shatter(clickX, clickY, textColor) {
          this.shattered = true;
          this.respawnTimer = 180; // 3 seconds at 60fps
          
          // Create a graphic of this letter
          const padding = 10;
          const gWidth = this.width + padding * 2;
          const gHeight = this.height + padding * 2;
          const letterGraphic = p.createGraphics(gWidth, gHeight);
          
          letterGraphic.pixelDensity(p.pixelDensity());
          letterGraphic.clear();
          letterGraphic.fill(textColor);
          letterGraphic.noStroke();
          if (font) {
            letterGraphic.textFont(font);
          }
          letterGraphic.textSize(fontSize);
          letterGraphic.textAlign(p.CENTER, p.BASELINE);
          letterGraphic.push();
          letterGraphic.translate(gWidth / 2, gHeight / 2 + fontSize * 0.35);
          letterGraphic.rotate(this.rotation);
          letterGraphic.text(this.char, 0, 0);
          letterGraphic.pop();
          
          // Generate random shard polygons
          const numShards = p.floor(p.random(5, 9));
          const centerGX = gWidth / 2;
          const centerGY = gHeight / 2;
          
          // Generate random points for Voronoi-like subdivision
          const points = [];
          for (let i = 0; i < numShards; i++) {
            points.push({
              x: p.random(-gWidth / 2, gWidth / 2),
              y: p.random(-gHeight / 2, gHeight / 2)
            });
          }
          
          // Create shards as triangular/polygonal pieces radiating from center
          for (let i = 0; i < numShards; i++) {
            const angle1 = (i / numShards) * p.TWO_PI + p.random(-0.2, 0.2);
            const angle2 = ((i + 1) / numShards) * p.TWO_PI + p.random(-0.2, 0.2);
            
            const r1 = p.random(gWidth * 0.4, gWidth * 0.7);
            const r2 = p.random(gWidth * 0.4, gWidth * 0.7);
            
            // Create polygon points for this shard
            const shardPoints = [
              { x: p.random(-3, 3), y: p.random(-3, 3) }, // Near center with jitter
              { x: p.cos(angle1) * r1, y: p.sin(angle1) * r1 },
              { x: p.cos((angle1 + angle2) / 2) * p.random(r1, r2), y: p.sin((angle1 + angle2) / 2) * p.random(r1, r2) },
              { x: p.cos(angle2) * r2, y: p.sin(angle2) * r2 }
            ];
            
            // Calculate shard center for positioning
            let shardCenterX = 0;
            let shardCenterY = 0;
            shardPoints.forEach(pt => {
              shardCenterX += pt.x;
              shardCenterY += pt.y;
            });
            shardCenterX /= shardPoints.length;
            shardCenterY /= shardPoints.length;
            
            // World position of shard
            const worldX = this.x + this.width / 2 + shardCenterX;
            const worldY = this.y - this.height / 2 + gHeight / 2 + shardCenterY;
            
            const shard = new Shard(
              letterGraphic,
              shardPoints,
              worldX,
              worldY,
              clickX,
              clickY
            );
            shards.push(shard);
          }
        }

        update() {
          if (this.shattered) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
              this.shattered = false;
              this.respawning = true;
              this.opacity = 0;
              // Reset position
              this.x = this.baseX;
              this.y = this.baseY;
              this.targetX = this.baseX;
              this.targetY = this.baseY;
              this.rotation = 0;
              this.targetRotation = 0;
            }
            return;
          }
          
          // Fade in when respawning
          if (this.respawning) {
            this.opacity += 5;
            if (this.opacity >= 255) {
              this.opacity = 255;
              this.respawning = false;
            }
          }
          
          if (this.isHovering) {
            this.hoverTime++;
            
            const accelFalloff = 1 / (1 + this.hoverTime * 0.1);
            const baseAccel = 0.02 * accelFalloff;
            
            this.velX += this.driftDirX * baseAccel;
            this.velY += this.driftDirY * baseAccel * 0.6;
            this.velRotation += this.driftDirRotation * baseAccel * 0.005;
            
            this.velX *= 0.96;
            this.velY *= 0.96;
            this.velRotation *= 0.96;
            
            this.targetX += this.velX;
            this.targetY += this.velY;
            this.targetRotation += this.velRotation;
            
          } else {
            const returnSpeed = 0.06;
            this.targetX = p.lerp(this.targetX, this.baseX, returnSpeed);
            this.targetY = p.lerp(this.targetY, this.baseY, returnSpeed);
            this.targetRotation = p.lerp(this.targetRotation, 0, returnSpeed);
            
            this.velX *= 0.9;
            this.velY *= 0.9;
            this.velRotation *= 0.9;
          }
          
          const dampen = 0.15;
          this.x = p.lerp(this.x, this.targetX, dampen);
          this.y = p.lerp(this.y, this.targetY, dampen);
          this.rotation = p.lerp(this.rotation, this.targetRotation, dampen);
        }

        draw(textColor) {
          if (this.shattered) return;
          
          p.push();
          p.translate(this.x + this.width / 2, this.y);
          p.rotate(this.rotation);
          p.textAlign(p.CENTER, p.BASELINE);
          
          // Apply opacity for fade-in effect
          const c = p.color(textColor);
          c.setAlpha(this.opacity);
          p.fill(c);
          
          p.text(this.char, 0, 0);
          p.pop();
        }
      }

      const initializeLetters = () => {
        letters = [];
        if (font) {
          p.textFont(font);
        }
        p.textSize(fontSize);
        
        let xPos = textStartX;
        const yPos = textStartY;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const charWidth = p.textWidth(char);
          const letter = new Letter(char, xPos, yPos);
          letter.width = charWidth;
          letters.push(letter);
          xPos += charWidth;
        }
        fontLoaded = true;
      };

      const loadFont = async () => {
        // If we already have a cached p5 font from a previous instance, use it
        if (cachedP5Font) {
          font = cachedP5Font;
          initializeLetters();
          return;
        }
        
        // Wait for preload to complete (should be fast if already done)
        await preloadFont();
        
        // Try to load font in p5, but with a very short timeout since font should already be loaded
        try {
          const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Font load timeout')), 500);
          });
          
          font = await Promise.race([
            p.loadFont('/font/Inter_Bold.ttf'),
            timeout
          ]);
          cachedP5Font = font; // Cache for future instances
        } catch (err) {
          console.warn('p5 font load failed, using CSS font:', err);
          font = null;
        }
        
        initializeLetters();
      };

      const canvasWidth = 350;
      const canvasHeight = 150;

      p.setup = () => {
        p.createCanvas(canvasWidth, canvasHeight);
        p.pixelDensity(window.devicePixelRatio || 1);
        
        // If we have a cached font, initialize immediately
        if (cachedP5Font) {
          font = cachedP5Font;
          initializeLetters();
        } else {
          // Otherwise load async
          loadFont();
        }
      };

      p.windowResized = () => {
        // Canvas size is fixed, no resize needed
      };

      p.mousePressed = () => {
        if (!fontLoaded) return;
        
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--color-text').trim() || '#ffffff';
        
        letters.forEach(letter => {
          if (letter.checkClick(p.mouseX, p.mouseY)) {
            letter.shatter(p.mouseX, p.mouseY, textColor);
          }
        });
      };

      p.draw = () => {
        p.clear();
        
        if (!fontLoaded || letters.length === 0) return;
        
        const mx = p.mouseX;
        const my = p.mouseY;
        
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--color-text').trim() || '#ffffff';
        
        p.fill(textColor);
        p.noStroke();
        if (font) {
          p.textFont(font);
        }
        p.textSize(fontSize);
        
        // Update and draw letters, track if any are hovered
        let anyHovered = false;
        letters.forEach(letter => {
          letter.checkHover(mx, my);
          letter.update();
          letter.draw(textColor);
          if (letter.isHovering && !letter.shattered) {
            anyHovered = true;
          }
        });
        
        // Update cursor hover state
        setIsHoveringLogo(anyHovered);
        
        // Update and draw shards
        shards = shards.filter(shard => !shard.dead);
        shards.forEach(shard => {
          shard.update();
          shard.draw();
        });
      };
    };

    // Pass container as second argument so p5 creates canvas inside it
    p5InstanceRef.current = new p5(sketch, containerRef.current);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      // Reset hover state on unmount
      setIsHoveringLogo(false);
    };
  }, [text, fontSize]); // setIsHoveringLogo is stable from zustand

  return (
    <div 
      ref={containerRef} 
      className="p5-logo-container"
    />
  );
}

export default P5Logo;