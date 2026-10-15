import { useMemo } from 'react';
import { create } from 'zustand';
import { findItem, newId } from '../data/siteDoc';
import { loadContent, loadRevision, saveContent } from './api';
import { addBlockRow, duplicateBlock, findBlock, removeBlock } from './layout';
import { addPage, describeChanges, listPages, movePage, removePage, updateContent, updateItem } from './tree';
import { canUpload, uploadFile } from './upload';

// Files uploading at once
const UPLOAD_CONCURRENCY = 3;

const HISTORY_LIMIT = 200;
// Edits to the same field closer together than this are one undo step
const COALESCE_MS = 1000;

// The editor's state. `doc` is the working copy of the whole site; `savedDoc`
// is what's live. Every change goes through edit(), which keeps the undo stack.
export const useEditor = create((set, get) => ({
  status: 'loading', // 'loading' | 'ready' | 'error'
  error: null,
  backend: null, // 'supabase' | 'local'
  doc: null,
  savedDoc: null,
  revision: null, // id of the revision savedDoc came from; null before the first save
  pageId: null,
  selectedId: null, // selected block
  revealId: null, // block to scroll into view (just added)
  uploads: [], // [{ id, name, progress 0–1, error }]
  past: [],
  future: [],
  lastEdit: null,
  saving: false,
  notice: null, // { kind: 'ok' | 'error', text }

  async load() {
    set({ status: 'loading', error: null });
    try {
      const { data, revision, backend, source } = await loadContent();
      const pageId = get().pageId && findItem(data, get().pageId) ? get().pageId : listPages(data)[0]?.id;
      set({
        status: 'ready',
        doc: data,
        savedDoc: data,
        revision,
        backend,
        pageId,
        selectedId: null,
        past: [],
        future: [],
        notice: source === 'snapshot'
          ? { kind: 'ok', text: 'Nothing saved yet: this is the copy in navigation.js. Your first save makes it the live version.' }
          : null,
      });
    } catch (error) {
      set({ status: 'error', error: error.message });
    }
  },

  edit(recipe, coalesceKey = null) {
    const { doc, past, lastEdit } = get();
    const next = recipe(doc);
    if (next === doc) return;
    const now = Date.now();
    const merge = coalesceKey && lastEdit?.key === coalesceKey && now - lastEdit.at < COALESCE_MS;
    set({
      doc: next,
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
    });
  },

  // Edits the current page's rows with a function from layout.js
  editRows(fn, coalesceKey) {
    const { pageId } = get();
    get().edit((doc) => updateContent(doc, pageId, (content) => ({ ...content, rows: fn(content.rows || []) })), coalesceKey);
  },

  editContent(fields, coalesceKey) {
    const { pageId } = get();
    get().edit((doc) => updateContent(doc, pageId, (content) => ({ ...content, ...fields })), coalesceKey);
  },

  // fn(item) → new item, for changes to both the menu entry and its content
  editPage(fn, coalesceKey) {
    const { pageId } = get();
    get().edit((doc) => updateItem(doc, pageId, fn), coalesceKey);
  },

  // A new block on its own row: below the selected block's row, else at the
  // end. pageId defaults to the page on screen.
  addBlock(block, pageId = get().pageId) {
    const { selectedId } = get();
    const onScreen = pageId === get().pageId;
    let id = null;
    get().edit((doc) => updateContent(doc, pageId, (content) => {
      const rows = content.rows || [];
      const selectedRow = onScreen && selectedId ? findBlock(rows, selectedId)?.rowIndex : undefined;
      const after = selectedRow ?? rows.length - 1;
      const next = addBlockRow(rows, block, after);
      id = next[after + 1].blocks[0].id;
      return { ...content, rows: next };
    }));
    if (onScreen && id) set({ selectedId: id, revealId: id });
  },

  // Uploads to R2, adding a block for each file to the page they were dropped
  // on as it finishes, even if you've moved to another page meanwhile
  async uploadFiles(fileList) {
    const { pageId } = get();
    const jobs = [...fileList].map((file) => ({ id: newId('u'), file }));
    const patch = (id, fields) => set((state) => ({ uploads: state.uploads.map((u) => (u.id === id ? { ...u, ...fields } : u)) }));
    set((state) => ({
      uploads: [
        ...state.uploads,
        ...jobs.map(({ id, file }) => ({ id, name: file.name, progress: 0, error: canUpload(file) ? null : 'Only images and MP4, WebM or MOV videos' })),
      ],
    }));
    const queue = jobs.filter(({ file }) => canUpload(file));
    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        try {
          const block = await uploadFile(job.file, (progress) => patch(job.id, { progress }));
          get().addBlock(block, pageId);
          get().dismissUpload(job.id);
        } catch (error) {
          patch(job.id, { error: error.message });
        }
      }
    }));
  },

  duplicateSelected() {
    const { selectedId } = get();
    let copyId = null;
    get().editRows((rows) => {
      const [next, id] = duplicateBlock(rows, selectedId);
      copyId = id;
      return next;
    });
    if (copyId) set({ selectedId: copyId, revealId: copyId });
  },

  deleteSelected() {
    const { selectedId } = get();
    get().editRows((rows) => removeBlock(rows, selectedId));
    set({ selectedId: null });
  },

  dismissUpload(id) {
    set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) }));
  },

  undo() {
    const { past, doc, future } = get();
    if (!past.length) return;
    set({ doc: past.at(-1), past: past.slice(0, -1), future: [doc, ...future], lastEdit: null });
    get().keepPageInView();
  },

  redo() {
    const { past, doc, future } = get();
    if (!future.length) return;
    set({ doc: future[0], past: [...past, doc], future: future.slice(1), lastEdit: null });
    get().keepPageInView();
  },

  // After undo/redo/restore the page on screen may no longer exist
  keepPageInView() {
    const { doc, pageId } = get();
    if (!findItem(doc, pageId)) set({ pageId: listPages(doc)[0]?.id ?? null, selectedId: null });
  },

  selectPage(pageId) {
    set({ pageId, selectedId: null });
  },

  select(selectedId) {
    set({ selectedId });
  },

  addPage(title, sectionId) {
    let id = null;
    get().edit((doc) => {
      const [next, newId] = addPage(doc, { title, sectionId });
      id = newId;
      return next;
    });
    set({ pageId: id, selectedId: null });
  },

  deletePage() {
    const { pageId } = get();
    get().edit((doc) => removePage(doc, pageId));
    set({ pageId: listPages(get().doc)[0]?.id ?? null, selectedId: null });
  },

  movePage(delta) {
    const { pageId } = get();
    get().edit((doc) => movePage(doc, pageId, delta));
  },

  async save() {
    const { doc, savedDoc, revision, saving } = get();
    if (saving || doc === savedDoc) return;
    set({ saving: true, notice: null });
    try {
      const saved = await saveContent(doc, revision, describeChanges(savedDoc, doc));
      set({ savedDoc: doc, revision: saved.revision, notice: { kind: 'ok', text: 'Saved. Live on the site within a few seconds.' } });
    } catch (error) {
      set({ notice: { kind: 'error', text: error.message } });
    } finally {
      set({ saving: false });
    }
  },

  // Back to what's live. Undoable, like any other edit.
  cancel() {
    get().edit(() => get().savedDoc);
    set({ selectedId: null, notice: null });
  },

  // Loads an old revision into the editor; saving it makes it live again
  async restore(id) {
    try {
      const { data } = await loadRevision(id);
      get().edit(() => data);
      get().keepPageInView();
      set({ selectedId: null, notice: { kind: 'ok', text: `Loaded revision ${id}. Save to make it live.` } });
    } catch (error) {
      set({ notice: { kind: 'error', text: error.message } });
    }
  },
}));

export const useIsDirty = () => useEditor((state) => state.doc !== state.savedDoc);

// The page being edited: { item, trail } or null
export function useCurrentPage() {
  const doc = useEditor((state) => state.doc);
  const pageId = useEditor((state) => state.pageId);
  return useMemo(() => (doc && pageId ? findItem(doc, pageId) : null), [doc, pageId]);
}
