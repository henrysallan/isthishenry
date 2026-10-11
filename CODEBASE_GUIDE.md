# Codebase Guide: isthishenry portfolio

_First mapped 2026-10-10. This is the starting point for optimization work, one area at a time. Update it as areas get done._

**Progress:** ✅ K (2026-10-10) · ✅ Baseline recorded in [perf/BASELINE.md](perf/BASELINE.md) (Lighthouse still pending) · ✅ C (2026-10-11) · ✅ B (2026-10-11) · ✅ E (2026-10-11) · ⏭️ A deferred (videos moving to FrameRate)

> ⚠️ **Live site:** every deep link (`/work`, `/about`, case studies) returns 404 in production, because `vercel.json` isn't deployed. See [perf/BASELINE.md §0](perf/BASELINE.md).

---

## 1. Snapshot

- **Stack:** React 19 + Vite 7 single-page app, Zustand store, GSAP and hls.js. p5 was removed in area C along with the logo animation. Plain JS and CSS, no TypeScript. Vitest covers routing and the navigation store.
- **Hosting:** static Vercel build (Firebase removed in area K). Media is served from Cloudflare R2 (`cdn.isthishenry.com`), plus 7 Vimeo HLS streams.
- **Size:** about 8.8k lines of JS and CSS, all live. The unused and archived code was removed in area K.

### Baseline numbers (measured 2026-10-10)

| Metric | Value |
|---|---|
| JS bundle | **1.95 MB min / 587 KB gzip / 474 KB brotli** (what Vercel serves), one chunk, no code splitting |
| p5 and its transitive deps (acorn, escodegen, i18next, colorjs, pako…) | **~1.0 MB** of that, used only by the "Henry Allan" logo. *Removed in C: JS is now 876 KB raw / 230 KB brotli* |
| hls.js | 510 KB, used only for the 7 Vimeo `.m3u8` blocks |
| Fonts | 2 TTFs (755 KB). Declared about 6 different ways, and Google Fonts Inter is loaded on top. *Since E: 118 KB of self-hosted WOFF2* |
| Media referenced in `navigation.js` | **150 CDN files, 2.2 GB total** |
| Images | 114 files, about 940 MB. **57 are over 5 MB** (PNGs up to 23 MB) |
| Home reel | **280 MB** MP4, autoplayed on `/` |
| Background preloader | tries to fully download **~928 MB of images**, and starts 9 videos (388 MB) with `preload="auto"`, on every visit |
| R2 `Cache-Control` | not set on any asset |
| React commits while idle | **2 per frame** on every page; a case study re-renders ~16 components per frame ([perf/BASELINE.md §2](perf/BASELINE.md)). *0 since C* |
| Forced wait before the site is usable | a fixed 3.5 s counter, then a click on the landing overlay. *Counter removed (D); the landing click remains for now* |

---

## 2. How the app boots

1. [index.html](index.html) preloads the three self-hosted Inter WOFF2 files (their faces are declared in `index.css`) and preconnects to the CDN.
2. [src/main.jsx](src/main.jsx) renders `<App>` in StrictMode.
3. Importing [navigationStore.js](src/store/navigationStore.js) runs `initFromUrl()` **at module level** ([navigationStore.js:245](src/store/navigationStore.js:245)). A deep link sets the state and marks the landing overlay as dismissed before the first render.
4. [App.jsx](src/App.jsx) mounts **every layer at once**, with nothing lazy loaded: menu canvas, content area, logo, cursor, landing overlay, return arrow, loading screen.
5. After 100 ms, `preloadAllAssets()` starts fetching every Work asset ([App.jsx:32](src/App.jsx:32) → [preloader.js:186](src/utils/preloader.js:186)).
6. *(The fixed 3.5 s loading counter that used to run here was removed in area D.)*
7. [LandingOverlay](src/components/LandingOverlay.jsx) draws a rectangle and a bezier "toy". Clicking "start here" expands the overlay and dismisses it to show the site. [ReturnArrow](src/components/ReturnArrow.jsx) (top-left ↖) brings it back.

## 3. Screen layers

```
┌───────────────────────────────────────────────────────────────────┐
│ ReturnArrow       ↖ top-left, reopens landing                     │
│ LandingOverlay    full-screen SVG: drifting bezier, shockwaves,   │
│                   drag handles, accelerometer on mobile           │
│ CustomCursor      spinning reticle that replaces the system cursor│
│ HomeTextOverlay   "Henry Allan" as plain text (static since C)    │
├────────────────┬──────────────────────────────────────────────────┤
│ P5Menu_canvas  │ ContentArea                                      │
│ 2D canvas menu │   /            → reel (VideoPlayer)              │
│ + bezier wires │   /work, /work/more → WorkList rows w/ thumbs    │
│ 25% width      │   /work/:id    → blocks grid + Lightbox          │
│ (top 35% on    │   /about       → text  /projects → card grid     │
│  mobile)       │   /contact     → links                           │
└────────────────┴──────────────────────────────────────────────────┘
```

Before area C, **6+ `requestAnimationFrame` loops** could run at once: the menu canvas, the p5 logo, the cursor, the landing drift loop, the landing main loop, and the shockwaves. Since C, an idle page runs at most the cursor loop (only while it's visible) plus the landing loops while the landing is showing.

## 4. State, routing and content

### Store: [navigationStore.js](src/store/navigationStore.js)
- **View state:** `currentView`, `currentMenu`, `activeMenuItem`, `expandedSubmenuId`, `expandedNestedSubmenuId`, `parentView`.
- **UI flags:** `isHoveringMenuItem`, `isHoveringLogo`, `isLandingDismissed` (`true` / `false` / `'returning'`).
- **Theme:** `currentTheme`, `isThemeInverted`. The site is always `classic` and never inverted.
- **Actions:** `navigateToHome`, `navigateToSubmenu`, `navigateToNestedSubmenu`, `navigateToPage`, `navigateToSubpage`, `goBack` (moves up one level based on context), `setTheme`.
- **URL sync:** a store subscriber pushes the URL whenever `currentView` changes. The `_skipUrlPush` flag stops it from echoing popstate and the initial load.

### Routing: [urlSync.js](src/utils/urlSync.js)
Builds `idToPath` / `pathToRoute` tables from `navigation.js` once, when the module is imported. Unknown paths fall back to home. Because of Vercel's catch-all rewrite, an unknown path is a "soft 404": the server returns 200 and the home page.

```
/                         home (reel)
/work                     expensify · smokeye-hill · welcome-jpeg · worksuite · it-cosmetics · kalshi · mschf
/work/2025-reel           (hideFromGrid)
/work/more                iraq-war-civ-casualties · guardrails-ai · lattafa · michael-m · on-slide
                          modl · fact-machine · psyche-organic · sketches
/about  /projects  /contact
```

### Content: [navigation.js](src/data/navigation.js) (563 lines)
All site content lives in this one hand-maintained JS object. Five modules read it: urlSync, preloader, P5Menu_canvas, ContentArea and HomeTextOverlay.

- **Fields the data actually uses:** `blocks[]` (`image` / `video` / `text`, laid out with `colSpan` / `colStart`, plus an optional `baseUrl`), `thumbnail`, `tags`, `year`, `description`, `isGrid`, `hideFromGrid`, `projects[]`, `aboutText`, `contactLinks`.
- **Fields ContentArea and the preloader support but nothing uses:** `videoUrl`, `videoKey`, `imageGallery`, `videoGallery`, `mediaGallery`, `sections`, plus the old About layout (`headline` / `statements` / `skills`).

---

## 5. File inventory

### Live

| File | Lines | Role |
|---|---:|---|
| [LandingOverlay.jsx](src/components/LandingOverlay.jsx) (+ css 118) | 1870 | Landing toy: SVG rectangle, noise-driven bezier, drag handles, shockwaves, accelerometer, GSAP expand/return |
| [ContentArea.jsx](src/components/ContentArea.jsx) (+ css 1079) | 956 | Right panel. Inline sub-components: `AboutMediaSlot`, `ProgressiveImage`, `LazyVideo`, `VimeoEmbed`, `WorkList`, plus the page renderers |
| [P5Menu_canvas.jsx](src/components/P5Menu_canvas.jsx) (+ P5Menu.css) | 1124 | Canvas 2D menu. Three menu levels, animated bezier wires, dot field, hit-testing, back button. No p5, despite the name. Stops drawing when idle (since C) |
| [navigation.js](src/data/navigation.js) | 563 | All content and site structure |
| [preloader.js](src/utils/preloader.js) | 231 | Background fetch of every Work asset |
| [VideoPlayer.jsx](src/components/VideoPlayer.jsx) (+ css 190) | 284 | Custom player (scrub bar, fake progress), used for the home reel |
| [CustomCursor.jsx](src/components/CustomCursor.jsx) (+ css) | 217 | Reticle cursor. Animates through direct DOM writes, and its loop only runs while visible (since C) |
| [navigationStore.js](src/store/navigationStore.js) | 245 | Zustand store and URL sync |
| [CyclingText.jsx](src/components/CyclingText.jsx) | 234 | Only used by the dormant About layout |
| [urlSync.js](src/utils/urlSync.js) | 194 | Route tables |
| [Lightbox.jsx](src/components/Lightbox.jsx) (+ css 142) | 174 | Fullscreen media viewer with keyboard nav and HLS |
| [theme.js](src/config/theme.js) | 86 | 6 color themes (only `classic` is used) plus layout constants |
| [App.jsx](src/App.jsx) | 79 | Layer composition, theme CSS variables, preloader kickoff |
| [ReturnArrow.jsx](src/components/ReturnArrow.jsx), [LoadingScreen.jsx](src/components/LoadingScreen.jsx), [LoadingSpinner.jsx](src/components/LoadingSpinner.jsx), [HomeTextOverlay.jsx](src/components/HomeTextOverlay.jsx) | <70 each | Small UI pieces. HomeTextOverlay renders the site name as plain text |
| [videoStreaming.jsx](src/utils/videoStreaming.jsx), [r2.js](src/config/r2.js) | 36 | R2 URL helpers. Only reached through the unused `videoKey` path |
| [urlSync.test.js](src/utils/urlSync.test.js), [navigationStore.test.js](src/store/navigationStore.test.js) | — | Characterization tests (21). They derive routes from `navigation.js`, so content edits don't break them |

### Removed in area K

All of this is recoverable from git history (last commit before removal: `e870ec2`).

- **Old code:** the old p5 menu (`P5Menu.jsx`, `p5Loader.js`), `WebcamSphere`, `ColorPicker`, `useFontLoader`, `_archive_threejs/` (5 files), and the unused `GridImage` / `GridVideo` components.
- **Dead exports:** `preloadGridThumbnails`, `getCriticalAssetUrls`, `isDeepLink`, plus about 20 unused variables.
- **Unused packages:** `three`, `@react-three/fiber`, `@react-three/drei`, `troika-three-text`, `leva`, `react-p5`.
- **Files:** `roughnessmap.png`, `Frame 25.png`, `backarrow.svg`, `vite.svg`, `react.svg`, 2 screenshots, 2 Figma JSON exports, `prompt.md`, and `.firebase/`.

**Still dead inside live files** (left for area F): ContentArea's render paths for `videoUrl` / `videoKey` / galleries / `sections`, the old About layout (`CyclingText`, `AboutMediaSlot`), and the `R2Video` helper.

---

## 6. Areas to explore

The areas are ordered by expected impact. Each one is meant to be a self-contained work session.

### A. Media pipeline & CDN ⏭️ *deferred: videos are moving to FrameRate*
**Where:** [navigation.js](src/data/navigation.js), [preloader.js](src/utils/preloader.js), the R2 bucket, the `WorkList` / `LazyVideo` / `ProgressiveImage` components in [ContentArea.jsx](src/components/ContentArea.jsx)

- **The preloader downloads nearly everything.** All 111 Work images (~928 MB) are fetched in full, 4 at a time, on every visit. The first 9 videos (388 MB) are also given `preload="auto"`. This competes with the reel and with whatever page the visitor is actually looking at.
- **Image sizes are far beyond what a browser can use.** PNGs reach 15–23 MB (Worksuite, Smokeye), GIFs total 129 MB, and nothing uses AVIF/WebP or `srcset`.
- **Thumbnails are full-size files.** The `/work` list autoplays all 7 thumbnails at once, about 200 MB in total; the Kalshi thumbnail alone is an 89 MB MP4. There are no posters, and the thumbnails are not lazy loaded ([ContentArea.jsx:466](src/components/ContentArea.jsx:466)).
- **Home reel:** a 280 MB MP4, linked directly. It needs a web encode (and possibly HLS or adaptive bitrate) plus a poster.
- **9 `.mov` files** may not play in every browser.
- **R2 sends no `Cache-Control`**, so repeat visits revalidate or refetch.
- The retry logic adds cache-busting query strings (`?_retry=n`), which defeats CDN caching on the very retries meant to help.
- **To decide:** an encoding pipeline (script vs. a service), thumbnail and poster conventions, and whether to keep any preloading at all. A likely option is to preload only the next likely click.
- **Status (2026-10-11):** deferred because video is moving to FrameRate. Two parts stay in this repo either way and could be done on their own: the oversized images (57 over 5 MB, served from R2) and the preloader in `src/utils/preloader.js`, which fully downloads every Work image (about 928 MB) on every visit.

### B. JS bundle & dependencies ✅ *done 2026-10-11*
**Where:** [loadHls.js](src/utils/loadHls.js), [ContentArea.jsx](src/components/ContentArea.jsx), [Lightbox.jsx](src/components/Lightbox.jsx), [package.json](package.json)

**Result:** the JS every page loads went from **474 KB to 101 KB brotli** (1,908 → 368 KB raw), against a target of under 250 KB.

**Done:**
- **p5 (about 1 MB):** removed in area C together with the logo animation. Its console error and per-frame argument validation went with it.
- **hls.js (510 KB raw / 130 KB brotli):** now loaded through [loadHls.js](src/utils/loadHls.js) the first time an `.m3u8` video mounts. Only Smokeye Hill uses it today. If the chunk fails to load, playback falls back to native HLS or the Vimeo iframe, the same path a fatal hls.js error takes.
- **Unused packages:** the 6 never-imported dependencies were removed in K. They were never bundled, so this didn't shrink anything.

**Left (small):**
- **GSAP (~69 KB raw):** used by LandingOverlay and CyclingText; could go with a landing refactor (H).
- **Splitting the landing overlay:** it isn't needed on deep links and could be a lazy chunk (H/D).
- **Bundled content:** `navigation.js` (~21 KB) ships inside the bundle; that's an area F decision.

### C. Runtime / render-loop performance ✅ *done 2026-10-11*
**Where:** [P5Menu_canvas.jsx](src/components/P5Menu_canvas.jsx), [ContentArea.jsx](src/components/ContentArea.jsx), [CustomCursor.jsx](src/components/CustomCursor.jsx), [LandingOverlay.jsx](src/components/LandingOverlay.jsx), [navigationStore.js](src/store/navigationStore.js), [HomeTextOverlay.jsx](src/components/HomeTextOverlay.jsx)

**Result:** idle React commits went from **2 per frame to 0** on every page, and component renders on a case study went from **16 per frame to 0**. The animation JavaScript per frame went from 0.38 ms to 0.02–0.17 ms. Before/after numbers are in [perf/BASELINE.md §2](perf/BASELINE.md).

**Done:**
- **Logo:** the p5 animation and interaction were removed (Henry's call). "Henry Allan" is now plain text in the same position, size and weight; the only visible difference is a normal-width space between the words. This also removed p5 from the bundle (area B) and the `isHoveringLogo` store flag.
- **Store:** `setHoveringMenuItem` no longer notifies subscribers unless the value changes. `ContentArea` uses per-field selectors instead of subscribing to the whole store.
- **Cursor:** position, rotation and radius are written straight to the DOM, so React only re-renders on visibility or hover changes. The loop pauses while the cursor is hidden. The dead `getComputedStyle` check was dropped; `cursor: none !important` made it always return `none`.
- **Menu:**
  - It stops drawing after 3 s and 240 frames with no input or navigation, and wakes on pointer events, resize or any store change. The frame count keeps a throttled tab from freezing it mid-animation.
  - Text widths are cached, and the 500-dot field is drawn as one path with one fill.
  - Bug fix: hover state used to stick after the pointer left the canvas, which kept the cursor shrunk and the dots displaced; it now resets on `mouseleave`.
- **Landing overlay:** its drift and frame loops, and its per-mousemove SVG updates, stop while it's dismissed. They restart on return.

**Left for other areas:**
- **Reduced motion:** honoring `prefers-reduced-motion` is a design call, so it's in area I.
- **Landing hover flicker:** a pointer resting on the landing card re-renders `LandingOverlay` about 15 times a second, because the card's drift and hover-grow move it under the pointer. Moved to area H.
- **Lint:** the React Compiler rules stay at warnings; the remaining hits are in ContentArea, the menu, VideoPlayer and LandingOverlay (areas F, G, H).

### D. First-load flow & perceived speed 🟠
**Where:** [App.jsx](src/App.jsx), [LandingOverlay.jsx](src/components/LandingOverlay.jsx)

- ✅ **Loading counter removed (2026-10-11).** The fixed 3.5 s counter (`LoadingScreen`) is gone. The landing overlay, or the page itself on a deep link, now shows straight away.
- **The landing click is still a gate.** Henry is deciding whether to keep the landing screen. If it stays, it could be skipped for returning visitors. If it goes, LandingOverlay, ReturnArrow and GSAP can be removed with it (see H).
- **Measure real LCP / INP / CLS** on Vercel Speed Insights or Lighthouse as the baseline before changing anything.

### E. Fonts ✅ *done 2026-10-11*
**Where:** [index.css](src/index.css) (`@font-face`), [index.html](index.html) (preloads), [src/assets/fonts/](src/assets/fonts/)

**Result:** fonts went from 738 KB of TTFs plus ~76 KB from Google Fonts to **118 KB**, all self-hosted, with no third-party requests and nothing render-blocking. Rendered text widths are identical at every weight and size tested (400–800 at 12–40 px).

**How the faces are set up:**
- **Before:** the static TTFs rendered weights 400 and 700, and Google's variable Inter (wght + opsz) rendered 500, 600 and 800.
- **After:** the same split, now self-hosted.
  - `Inter-Variable-latin.woff2` (73 KB) is Fontsource's copy of Google's Latin build. It renders 500, 600 and 800.
  - `Inter-Regular.woff2` (27 KB) and `Inter-Bold.woff2` (21 KB) are the same TTFs subset to Latin plus arrows, keeping the default OpenType features and `tnum` (used by the video timer). They render 400 and 700 and are declared after the variable face so they win for those weights.
- **Delivery:** the fonts live in `src/assets/` so Vite hashes them; they get the immutable `/assets` cache, and the preload links in `index.html` point at the hashed files.
- **One family:** the `InterBold` and `Inter Bold` aliases are gone. The menu canvas and the landing headline use `Inter` at weight 700, which is the same file as before.

**Notes:**
- **Missing characters:** anything outside Latin, such as the ⟳ retry icon (not in Inter anyway), falls back to the system font, just as it did with Google's Latin subset.
- **Regenerating the subsets:** use `subset-font` with the ranges in `index.css` and `keepFeatures: ['kern','liga','calt','ccmp','locl','mark','mkmk','rlig','rvrn','tnum']`. The original TTFs are in git history (`public/font/`, before this change).

### F. ContentArea & content model 🟡
**Where:** [ContentArea.jsx](src/components/ContentArea.jsx), [ContentArea.css](src/components/ContentArea.css), [navigation.js](src/data/navigation.js)

- **ContentArea is a monolith:** 956 lines of JS plus 1079 of CSS, with several sub-components inline. About half the render paths serve schema fields no content uses (see §4).
- **Repeated logic:**
  - Media-type detection (`endsWith('.mp4')…`) is repeated in about 17 places.
  - Three loaders each have their own fake-progress timer and retry code.
  - Theme-inversion logic is copied into App, LandingOverlay, P5Menu_canvas and ReturnArrow.
- **The content model needs a decision.** Options: keep it as a JS file, move it to JSON/MDX with a schema, or use a headless CMS (a Sanity connection is available in this environment). Generating image and poster variants could be tied to this choice.

### G. Navigation, menu & routing 🟡
**Where:** [P5Menu_canvas.jsx](src/components/P5Menu_canvas.jsx), [navigationStore.js](src/store/navigationStore.js), [urlSync.js](src/utils/urlSync.js), [vercel.json](vercel.json)

- The menu is drawn only on a canvas, so there are **no real links**: nothing crawlable, no keyboard focus, no screen-reader access. A hidden DOM `<nav>` mirror would fix all three.
- The store's go-back logic is fairly intricate, with 5 branches. Since K it's covered by tests in [navigationStore.test.js](src/store/navigationStore.test.js).
- Unknown routes are a soft 404.

### H. Landing overlay 🟡
**Where:** [LandingOverlay.jsx](src/components/LandingOverlay.jsx) (1870 lines)

- It has 12 `useState`s, 34 refs, 18 effects, and two near-duplicate GSAP sequences (expand and return).
- It's a strong candidate for splitting into a hook or module (bezier system, frame driver, intro and outro timeline) together with the loop pausing from area C.
- It doesn't need to load at all on deep links.
- **Bug:** after arriving on a deep link, the ↖ return arrow does nothing. The overlay renders `null` when it was skipped on mount, so `'returning'` is never handled, and the arrow then hides because `isLandingDismissed` is no longer `true`.
- **Hover flicker:** a stationary pointer resting on the card re-renders it about 15 times a second, because its drift and hover-grow move it under the pointer and fire enter/leave events (found in C).

### I. SEO, sharing & accessibility 🟡
**Where:** [index.html](index.html), [vercel.json](vercel.json), all components

- **Sharing and search metadata:**
  - There's one global `<title>` and one OG image (`preview.png`, 940 KB). Case studies have no per-route title, description or OG tags.
  - There is no sitemap or `robots.txt`.
  - All content lives in the JS bundle, which crawlers may not render.
- **Accessibility:**
  - Nothing respects `prefers-reduced-motion`.
  - The custom cursor hides the system cursor (`cursor: none !important`).
  - ARIA is used only in VideoPlayer and Lightbox, and image alt text is generic.
- **To decide:** whether to prerender static HTML per route (Vite SSG or prerender plugin) or stay a pure SPA.

### J. CSS & theming 🟢
**Where:** [index.css](src/index.css), [App.css](src/App.css), [theme.js](src/config/theme.js), component CSS

- index.css still contains Vite starter styles (link colors, a dark `button` background, `body { display:flex; place-items:center }`) that later rules override.
- There are 6 themes, but the site is hard-wired to `classic`. The unused ColorPicker was deleted in K; restore it from git (`git show e870ec2:src/components/ColorPicker.jsx`) if wanted. Otherwise collapse to CSS variables only.

### K. Repo hygiene, deploy & tooling ✅ *done 2026-10-10*
**Where:** repo root, [package.json](package.json), [vercel.json](vercel.json), [README.md](README.md), [eslint.config.js](eslint.config.js), [vite.config.js](vite.config.js)

**Done:**
- **Firebase removal:** finished; `.firebase/` deleted. Everything listed under "Removed in area K" (§5) is gone.
- **Dependencies:** 6 unused packages removed. `npm audit fix` cleared all 15 advisories (all in dev tooling: Vite 7.3.7, Rollup, PostCSS).
- **vercel.json:** a 1-week cache for `/font/*`, plus `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on every route. `Permissions-Policy` leaves the accelerometer alone because the landing overlay uses it.
- **Production logs:** `console.log` / `console.debug` are stripped from production builds. `warn` / `error` stay.
- **Lint:** `npm run lint` passes with 0 errors (it had 60). The remaining 25 warnings are the React Compiler and hook-dependency rules, tracked in C, F and H.
- **Tests:** Vitest 5 + happy-dom. `npm test` runs 21 characterization tests for urlSync and the navigation store.
- **README:** rewritten for the current stack and structure. Node 22.12+ is required for Vitest.

**Left open:**
- ⚠️ **Deploy `vercel.json` (urgent):** production has no SPA rewrite, so every deep link returns 404, and none of the new headers apply. Commit it and redeploy.
- **CI:** there's no GitHub Actions workflow yet for lint + test on push. Vercel only runs `build`.
- **Framing headers:** no `X-Frame-Options` / CSP, so embeds keep working. A real CSP needs care because of Google Fonts, the CDN, Vimeo and the hls.js blob workers.
- **Global npm:** your npm 11.3 crashes when installing Vitest (an arborist `edgesOut` bug). Updating it with `npm i -g npm@latest` fixes this.

---

## 7. Suggested order

1. ~~**K (cleanup)**~~ ✅
2. ~~**Baseline**~~ ✅ [perf/BASELINE.md](perf/BASELINE.md). Weight and render cost are recorded; Lighthouse is pending.
3. ~~**C (render loops)**~~ ✅
4. ~~**B (bundle)**~~ ✅
5. **A (media):** the biggest payoff, but it needs an encoding and asset workflow decision.
6. ~~**E (fonts)**~~ ✅, then **D (first load)**.
7. **F, G, H, I, J:** structural and quality work, in whatever order matches priorities.

## 8. Open questions for Henry

- Are the loading counter and landing overlay must-keep brand moments, or are they open to change?
- Should the original source files on R2 stay untouched, with optimized variants stored next to them?
- Is SEO or crawlability of the case studies a goal, or is the site shared mostly by direct link?
- Is a CMS on the table, or should content stay in the repo?
