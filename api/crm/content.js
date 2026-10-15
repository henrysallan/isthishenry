// /api/crm/content — the editor's read and save of the site document.
//   GET              → { revision, data, source, backend } for the newest revision
//   GET ?revision=12 → that revision, to restore from
//   GET ?history=1   → { revisions: [{ id, created_at, note }] }, newest first
//   PUT { data, baseRevision, note } → saves data as a new revision, which goes
//       live right away. 409 if someone saved since baseRevision was loaded.
import { validateDoc } from '../../src/data/siteDoc.js';
import { editorOnly, reply } from '../_lib/session.js';
import { liveSite } from '../_lib/siteContent.js';
import { getStore, storeBackend, StoreError } from '../_lib/store.js';

const HISTORY_LENGTH = 50;
const MAX_DOC_BYTES = 2_000_000;
const MAX_NOTE_LENGTH = 200;

function storeFailed(error) {
  console.error('Site store error:', error.message);
  const message = error instanceof StoreError ? error.message : 'Couldn’t reach the database.';
  return reply({ error: message }, 502);
}

export const GET = editorOnly(async (request) => {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has('history')) {
      return reply({ revisions: await getStore().list(HISTORY_LENGTH) });
    }
    if (params.has('revision')) {
      const row = await getStore().get(params.get('revision'));
      if (!row) return reply({ error: 'No such revision.' }, 404);
      return reply({ revision: row.id, data: row.data, source: 'store', backend: storeBackend() });
    }
    // Before the first save this is the navigation.js snapshot; saving it
    // creates revision 1
    const { doc, revision, source } = await liveSite();
    return reply({ revision, data: doc, source, backend: storeBackend() });
  } catch (error) {
    return storeFailed(error);
  }
});

export const PUT = editorOnly(async (request) => {
  const body = await request.text();
  if (body.length > MAX_DOC_BYTES) return reply({ error: 'That’s too much content to save at once.' }, 413);
  let data, baseRevision, note;
  try {
    ({ data, baseRevision, note } = JSON.parse(body));
  } catch {
    return reply({ error: 'Send the site document as JSON.' }, 400);
  }
  const problems = validateDoc(data);
  if (problems.length) return reply({ error: `Can’t save: ${problems.slice(0, 3).join('; ')}` }, 422);

  try {
    const store = getStore();
    const latest = await store.latest();
    if ((latest?.id ?? null) !== (baseRevision ?? null)) {
      return reply({ error: 'The site changed since you opened it (another tab?). Reload to get the newest version.', revision: latest?.id }, 409);
    }
    const saved = await store.insert(data, typeof note === 'string' ? note.slice(0, MAX_NOTE_LENGTH) : null);
    return reply({ revision: saved.id, created_at: saved.created_at });
  } catch (error) {
    return storeFailed(error);
  }
});
