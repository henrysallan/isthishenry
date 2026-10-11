# Performance baseline

_Recorded 2026-10-10/11, after area K and before any optimization work. Code: `e870ec2` plus the uncommitted K cleanup. Machine: Apple M4 Pro, Chrome 154._

Re-run the same measurements after each area and add a column, so every change has a before/after.

| Area | Done | Headline |
|---|---|---|
| C (render loops) | 2026-10-11 | Idle React commits went from 2 per frame to **0**. JS went from 474 to **230 KB brotli** (p5 removed with the logo animation). |
| B (bundle) | 2026-10-11 | hls.js now loads only on pages with Vimeo streams. The JS every page loads went from 230 to **101 KB brotli**. |
| A (media) | 2026-10-11 | Videos stream from FrameRate (Mux HLS, adaptive, with posters); 108 images re-encoded as JPEGs at 640/1280/2560 px with `srcset` and blur previews; the background preloader is gone. CDN files referenced went from **2.2 GB to 157 MB**, plus the streams. The 6 GIFs are untouched (largest 51 MB, on Sketches). Raw data: [results/after-a-weight.json](results/after-a-weight.json). |
| E (fonts) | 2026-10-11 | Fonts went from 738 KB of TTFs + ~76 KB from Google Fonts to **118 KB of self-hosted WOFF2**. No third-party font requests; text widths are unchanged at every weight. |

---

## 0. Production issue found while measuring

**Every deep link on the live site returns 404.** `/work`, `/about`, `/work/expensify` and every other route except `/` get Vercel's `NOT_FOUND` page. The SPA rewrite lives in `vercel.json`, which is untracked, so the deployed build doesn't have it. That also means none of its headers apply: production `/assets/*` is served with `max-age=0` instead of the 1-year immutable cache.

**Fix:** commit `vercel.json` and redeploy. Until then, shared case-study links are broken, and so is refreshing on any page other than `/`.

---

## 1. Weight: what the build ships and what each page downloads

From `npm run perf:weight` (raw data: [results/baseline-weight.json](results/baseline-weight.json)).

| | Baseline | After C | After B |
|---|---|---|---|
| JS loaded on every page | **1,908 KB** raw / 572 KB gzip / **474 KB brotli**, 1 chunk | **876 KB** raw / 273 KB gzip / **230 KB brotli** | **368 KB** raw / 117 KB gzip / **101 KB brotli** |
| JS loaded on demand | none | none | hls.js: 510 KB raw / 130 KB brotli, only on pages with `.m3u8` streams (currently Smokeye Hill) |
| Fonts | 738 KB raw / 283 KB brotli (2 TTFs), plus Google Fonts CSS (5 KB) and a 71 KB variable WOFF2 | same | same → **after E: 118 KB** (3 self-hosted WOFF2: variable 73 KB, Regular 27 KB, Bold 21 KB) |
| CDN media referenced | 150 files, **2,201 MB** | same | same |
| Images over 5 MB | **57** (largest 23 MB) | same | same |
| CDN files with `Cache-Control` | **0 / 150** | same | same |
| Preloader, every visit | **928 MB** of images fully downloaded + 388 MB of video with `preload="auto"` | same | same |

**Media per page.** These sums assume every item on the page is fully loaded. Videos stream, so this is the upper bound a visitor can pull.

| Page | Items | MB | Largest file |
|---|---:|---:|---:|
| `/work/worksuite` | 20 | **338** | 22.7 MB |
| `/work/kalshi` | 8 | **322** | 93.5 MB |
| `/` (reel) | 1 | **280** | 279.7 MB |
| `/work/more/sketches` | 20 | 258 | 53.1 MB |
| `/work` (list thumbnails) | 7 | 202 | 89.4 MB |
| `/work/mschf` | 14 | 202 | 33.5 MB |
| `/work/more/michael-m` | 8 | 195 | 51.7 MB |
| `/work/expensify` | 9 | 135 | 44.9 MB |
| `/work/more` (list thumbnails) | 9 | 119 | 50.7 MB |
| `/projects` | 5 | 101 | 51.5 MB |

## 2. Render cost while idle (area C)

From [react-probe.js](react-probe.js) run in the in-app browser (raw data: [results/baseline-renders.json](results/baseline-renders.json)). There's no mouse input during measurement, so the ideal is **0 commits per frame**: nothing on screen is changing state.

| Scenario | React commits / frame | Component renders / frame | rAF loops | JS in rAF callbacks |
|---|---:|---:|---:|---:|
| Landing (`/`) | **2** | 4.1 | 5 | 0.38 ms/frame |
| Home, landing dismissed | **2** | 4.0 | 5 | 0.38 ms/frame |
| Work list (`/work`) | **2** | 4.0 | 4 | 0.38 ms/frame |
| Case study (`/work/expensify`) | **2** | **16.0** | 4 | 0.36 ms/frame |

**What re-renders every frame** (dev server, where component names are readable):
- **All pages:**
  - `ContentArea` renders 2× per frame, driven by the per-frame store writes from P5Logo and the menu.
  - `CustomCursor` renders 1×.
- **Page-specific renders on top of that:**
  - **Landing:** `VideoPlayer` 2× and `LoadingSpinner` 2×.
  - **Work list:** `WorkList` 2×, re-rendering all 7 rows.
  - **Case study:** `LazyVideo` 10× and `ProgressiveImage` 8×, so every block re-renders twice a frame. The cost grows with page length: Worksuite has 20 image blocks.

**After area C** (raw data: [results/after-c-renders.json](results/after-c-renders.json)). Same scenarios on the production build, with the pointer parked in the page corner:

| Scenario | React commits / frame | Component renders / frame | rAF loops | JS in rAF callbacks |
|---|---:|---:|---:|---:|
| Landing (`/`) | **0** | **0** | 3 (overlay ×2 + cursor) | 0.17 ms/frame |
| Home, landing dismissed | **0** | **0** | 1 (cursor) | 0.02 ms/frame |
| Work list (`/work`) | **0** | **0** | 1 (cursor) | 0.02 ms/frame |
| Case study (`/work/expensify`) | **0** | **0** | 1 (cursor) | 0.03 ms/frame |

The cursor loop only runs while the cursor is visible, so with the pointer off the page (as in the baseline) every page except the landing has 0 loops. The menu stops drawing once 3 s and 240 frames pass with no input or navigation. The landing overlay's loops stop once it's dismissed.

**How to read this.** On an M4 Pro this is invisible: the animation JavaScript is about 0.4 ms of a 16.7 ms frame, and nothing reaches long-task territory. React's re-render work comes on top, since the probe can't time it. The cost is waste rather than visible jank: at 60–120 Hz that's 120–240 commits per second and up to about 2,000 component renders per second on a case study, all doing nothing. It shows up as battery drain and as jank on slower phones and laptops. **Area C target:** 0 commits per frame when idle, and no component renders that aren't caused by input.

## 3. Lighthouse: pending

Two attempts failed:
- **Locally:** Chrome launched from this tooling renders the site at 1–5 fps, whatever the sandbox, headless or GPU settings. Henry's own browser runs it smoothly, so Lighthouse's CPU-based metrics (TBT, LCP) would be meaningless from here.
- **PageSpeed Insights API:** the anonymous quota is exhausted (HTTP 429).

Options:
1. Run [pagespeed.web.dev](https://pagespeed.web.dev) on `https://www.isthishenry.com/` for mobile and desktop. It runs on Google's machines. Once the 404 fix is deployed, `/work` and `/work/expensify` can be tested the same way.
2. Run the Lighthouse panel in your own Chrome DevTools against `npm run perf:serve` (production build on :4180).

| Page | Mobile perf | Desktop perf | LCP (m) | TBT (m) | CLS | Notes |
|---|---:|---:|---:|---:|---:|---|
| `/` | | | | | | |
| `/work` | | | | | | blocked by the 404 until redeploy |
| `/work/expensify` | | | | | | blocked by the 404 until redeploy |

## 4. Optional manual check

Chrome → Window → Task Manager: the tab's CPU % after sitting idle for 10 s on `/work`, with the mouse off the window. This is the most direct real-world number for area C.

| Page | CPU % idle |
|---|---:|
| `/work` | |
| `/work/expensify` | |

---

## How to re-run

```bash
npm run build
npm run perf:weight -- --label after-c     # writes perf/results/after-c-weight.json
npm run perf:serve                         # production build, compressed like Vercel, on :4180
```

**Render probe:** open a page on `npm run dev` (for component names) or on `:4180` (for production counts). Wait about 8 s for the intro to finish, then paste [react-probe.js](react-probe.js) into the DevTools console. It resolves with the numbers after 10 s.

**Why there's no automated browser harness:** headless and automated Chrome on this machine render the site at 1–5 fps even with all CDN media blocked. Detaching any one of the cursor, logo, menu or content layers brings it back to 35–60 fps. Henry's normal browser shows none of this, so frame rate and CPU numbers from automation would be misleading. The probe only counts JavaScript-level events, so it's unaffected.
