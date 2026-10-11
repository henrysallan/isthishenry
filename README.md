# isthishenry Portfolio

Henry Allan's design portfolio: a single-page React app with a canvas-drawn
menu, an interactive landing overlay and case-study pages.

## Tech Stack

- **React 19** + **Vite 7** - UI framework and build tool
- **Zustand** - navigation state, synced with the URL
- **Canvas 2D / SVG** - menu, landing overlay and cursor are drawn by hand
- **GSAP** - landing and text transitions
- **hls.js** - Vimeo HLS playback
- **Vitest** + **ESLint** - tests and linting
- **Vercel** - hosting
- **Cloudflare R2** - media storage (`cdn.isthishenry.com`)

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
npm test       # Vitest (routing + navigation store)
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

## Cloudflare R2 Setup

Cloudflare R2 is configured for video streaming. You'll need to:

1. Create an R2 bucket in your Cloudflare dashboard
2. Set up a public domain for your bucket
3. Add the bucket name and public URL to your `.env` file (and to Vercel)

## Project Structure

```
├── src/
│   ├── App.jsx              # Composes the screen layers, applies theme CSS vars
│   ├── components/          # Menu canvas, content area, landing overlay, logo, cursor, players
│   ├── data/navigation.js   # All site content and structure (pages, case studies, media URLs)
│   ├── store/               # Zustand navigation store (+ tests)
│   ├── utils/               # URL sync (+ tests), asset preloader, R2 helpers
│   └── config/              # Color themes, R2 env config
├── public/                  # Fonts, favicon, link-preview image
├── vercel.json              # Vercel build, SPA rewrite, headers
└── .env.example             # Environment variables template
```

Adding or editing a case study only touches `src/data/navigation.js`; URLs and
menu entries are derived from it.

## License

MIT
