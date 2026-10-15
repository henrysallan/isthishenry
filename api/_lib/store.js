// Where the site document lives: one row per saved revision in the Supabase
// table site_revisions (supabase/schema.sql). The newest row is the live site.
//
// Needs SUPABASE_URL and SUPABASE_SECRET_KEY (server-only). Without them,
// `npm run dev` keeps revisions in .crm-local/revisions.json instead, so the
// editor works offline; on Vercel that's an error.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TABLE = 'site_revisions';
const LOCAL_FILE = path.join(process.cwd(), '.crm-local', 'revisions.json');

export class StoreError extends Error {}

export function storeBackend() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) return 'supabase';
  if (!process.env.VERCEL) return 'local';
  return null;
}

// ── Supabase (PostgREST over fetch; no SDK needed for four queries) ──

async function supabase(query, init = {}) {
  const key = process.env.SUPABASE_SECRET_KEY;
  const headers = { apikey: key, 'content-type': 'application/json', ...init.headers };
  // Legacy service_role keys are JWTs and go in Authorization too; the newer
  // sb_secret_ keys aren't JWTs and must only be sent as apikey
  if (key.startsWith('eyJ')) headers.authorization = `Bearer ${key}`;
  const url = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${TABLE}?${query}`;
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    throw new StoreError(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

const supabaseStore = {
  async latest() {
    const [row] = await supabase('select=id,created_at,note,data&order=id.desc&limit=1');
    return row ?? null;
  },
  async get(id) {
    const [row] = await supabase(`select=id,created_at,note,data&id=eq.${Number(id)}`);
    return row ?? null;
  },
  async list(limit) {
    return supabase(`select=id,created_at,note&order=id.desc&limit=${limit}`);
  },
  async insert(data, note) {
    const [row] = await supabase('select=id,created_at,note', {
      method: 'POST',
      headers: { prefer: 'return=representation' },
      body: JSON.stringify({ data, note }),
    });
    return row;
  },
};

// ── Local file, for development without Supabase ──

async function readLocal() {
  try {
    return JSON.parse(await readFile(LOCAL_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const summary = ({ id, created_at, note }) => ({ id, created_at, note });

const localStore = {
  async latest() {
    return (await readLocal()).at(-1) ?? null;
  },
  async get(id) {
    return (await readLocal()).find((row) => row.id === Number(id)) ?? null;
  },
  async list(limit) {
    return (await readLocal()).slice(-limit).reverse().map(summary);
  },
  async insert(data, note) {
    const rows = await readLocal();
    const row = { id: (rows.at(-1)?.id ?? 0) + 1, created_at: new Date().toISOString(), note, data };
    rows.push(row);
    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await writeFile(LOCAL_FILE, JSON.stringify(rows));
    return summary(row);
  },
};

export function getStore() {
  const backend = storeBackend();
  if (backend === 'supabase') return supabaseStore;
  if (backend === 'local') return localStore;
  throw new StoreError('Supabase isn’t configured: set SUPABASE_URL and SUPABASE_SECRET_KEY');
}
