-- The site's content, one row per save from the editor at /crm. The newest row
-- is what the site shows (api/site.js); older rows are the editor's history.
-- Run once in Supabase → SQL Editor.

create table if not exists public.site_revisions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- What changed, e.g. "Edited Expensify; Added Lattafa"
  note text,
  -- The whole site document: { version: 2, home, mainMenu } (src/data/siteDoc.js)
  data jsonb not null
);

-- No policies, so the public API keys can't read or write this table. Only the
-- server, with SUPABASE_SECRET_KEY (which bypasses row level security), can.
alter table public.site_revisions enable row level security;
