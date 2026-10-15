// GET /api/site — the site's content (pages, menu, media) as JSON, read by every
// visitor's first load (index.html starts the request). Vercel's CDN caches it
// and serves the cached copy while it refreshes, so a save from the editor
// reaches visitors within seconds without them waiting on Supabase.
import { liveSite } from './_lib/siteContent.js';

export async function GET() {
  const { doc, source } = await liveSite();
  // The snapshot only stands in when the store failed or is empty, so retry sooner
  const cdnMaxAge = source === 'store' ? 10 : 5;
  return Response.json(doc, {
    headers: {
      'cache-control': 'public, max-age=0, must-revalidate',
      'vercel-cdn-cache-control': `max-age=${cdnMaxAge}, stale-while-revalidate=31536000`,
      'x-site-source': source,
    },
  });
}
