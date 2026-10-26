# isthishenry Portfolio

Henry Allan's design portfolio: a single-page React app with a canvas-drawn
menu, case-study pages, a site search with AI answers, light and dark themes,
and a password-protected editor at `/crm` for laying out pages.

## Tech Stack

- **React 19** + **Vite 7** - UI framework and build tool
- **Zustand** - navigation state, synced with the URL
- **Canvas 2D / SVG** - menu and cursor are drawn by hand
- **GSAP** - text transitions
- **hls.js** - Vimeo HLS playback
- **Vitest** + **ESLint** - tests and linting
- **Vercel** - hosting
- **Cloudflare R2** - media storage (`cdn.isthishenry.com`)
- **Supabase** - the site's content (pages, menu, media layout), edited at `/crm`

See [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md) for an architecture map and the
optimization roadmap.

## Getting Started

### Prerequisites

- Node.js 22.12+ (24 recommended; Vitest needs 22.12+)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/henrysallan/isthishenry.git
cd isthishenry
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`

### Development

Run the development server:
```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Checks

```bash
npm run lint   # ESLint
npm test       # Vitest (routing, navigation and theme stores, editor layout)
```

## Deployment (Vercel)

The site is a static Vite build hosted on Vercel. `vercel.json` sets the build
output to `dist` and rewrites every route to `index.html` so deep links like
`/work/expensify` resolve client-side.

Pushes to `main` deploy to production automatically once the GitHub repo is
connected to the Vercel project. To deploy manually from the CLI:

```bash
vercel          # preview deployment
vercel --prod   # production deployment
```

Environment variables from `.env.example` must also be added in the Vercel
dashboard (Project → Settings → Environment Variables).

## Site editor (`/crm`)

`isthishenry.com/crm` is a password-protected editor for the site's pages. The
left column holds the controls (page details, adding media, the selected
block's settings, Save and Cancel); the right is the page as the site shows it,
with media as still thumbnails you can rearrange:

- **Rows on a 12-column grid.** Drag a block into a gap in any row, or between
  rows to give it a row of its own. Drag a block's side edges to change how many
  columns it spans. Hover a row for move up/down and delete.
- **Add** media by pasting a link (image, video, Mux, Vimeo), uploading files
  (or dropping them on the page), or adding text. Uploads go straight to R2;
  photos become 640/1280/2560px JPEGs plus a blur preview, like
  `scripts/build-images.mjs`, and videos get a poster frame.
- **Save** makes the changes live (visitors see them within ~10 seconds).
  Every save is kept: **History** loads an older version to save again.
  **Cancel** goes back to what's live; Undo/Redo cover everything in between.
- Keys: ⌘S save, ⌘Z / ⇧⌘Z undo/redo; with a block selected, Delete, ⌘D
  duplicate, ←/→ move a column, ⇧←/⇧→ narrow/widen, Esc deselect.

### How content flows

The content is one JSON document (`src/data/siteDoc.js` describes it) stored
in Supabase as one row per save. `api/site.js` serves the newest row, cached at
Vercel's edge; `index.html` starts fetching it while the code downloads, and
`src/main.jsx` waits for it before the first render. If that fails, the site
falls back to `src/data/navigation.js`, which is now only that fallback (and the
starting point before the first save): edit pages in the editor, not there.

### Setup

1. **Supabase:** run `supabase/schema.sql` in the SQL Editor. Then add
   `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Settings → API Keys) to Vercel.
   The first time you open the editor it shows `navigation.js`; your first
   Save stores it as revision 1.
2. **Sign-in:** add `CRM_PASSWORD` and `CRM_SESSION_SECRET`
   (`openssl rand -hex 32`) to Vercel.
3. **Uploads:** create an R2 API token with Object Read & Write on the bucket,
   add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`, and add a
   CORS policy to the bucket (R2 → bucket → Settings → CORS policy) so the
   browser can upload:

   ```json
   [
     {
       "AllowedOrigins": ["https://isthishenry.com", "https://www.isthishenry.com", "http://localhost:5173"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "cache-control"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

All of these are server-only (see `.env.example`). For `npm run dev`, put them
in `.env.local`; without the Supabase pair, the dev server saves revisions to
`.crm-local/revisions.json` instead, so the editor works offline.

## Light and dark themes

Every color on the site is a CSS variable in `src/index.css`: the light set on
`:root`, the dark set under `:root[data-theme='dark']`. Use those variables
(e.g. `var(--color-panel)`) rather than hex values in component styles. The menu
canvas reads them too (`readCanvasColors` in `P5Menu_canvas.jsx`), so keep the
ones it reads as `#rrggbb`.

The site follows the visitor's system setting until they press the toggle beside
the search bar; their pick is saved in `localStorage` (`theme`), and picking the
system's own theme goes back to following it. A script in `index.html` sets
`data-theme` before the first paint so there's no flash, and
`src/store/themeStore.js` takes over from there (cross-tab sync, system changes,
the browser bar's `theme-color`). The editor at `/crm` always stays light.

## Cloudflare R2 Setup

Cloudflare R2 is configured for video streaming. You'll need to:

1. Create an R2 bucket in your Cloudflare dashboard
2. Set up a public domain for your bucket
3. Add the bucket name and public URL to your `.env` file (and to Vercel)

## Project Structure

```
├── src/
│   ├── App.jsx              # Composes the screen layers
│   ├── components/          # Menu canvas, content area, site search, cursor, players
│   ├── crm/                 # The /crm site editor (own chunk; visitors never load it)
│   ├── data/                # Site document helpers; navigation.js is the fallback snapshot
│   ├── store/               # Zustand navigation and light/dark theme stores (+ tests)
│   ├── utils/               # URL sync (+ tests), asset preloader, R2 helpers
│   ├── index.css            # Fonts and every color, light and dark
│   └── config/              # Layout constants, R2 env config
├── api/                     # Vercel Functions: site content, editor API, AI answers
├── supabase/schema.sql      # The table the site's content lives in
├── public/                  # Fonts, favicon, link-preview image
├── vercel.json              # Vercel build, SPA rewrite, headers
└── .env.example             # Environment variables template
```

Pages, case studies and their media are edited at `/crm`; URLs and menu
entries are derived from the content document.

## License

MIT
