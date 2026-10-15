import { useEffect, useMemo, useRef, useState } from 'react';
import { isVideoSrc } from '../data/siteDoc';
import { loadHistory, signOut } from './api';
import { findBlock, setColumns, updateBlock } from './layout';
import { useCurrentPage, useEditor, useIsDirty } from './store';
import { listPages, listSections } from './tree';

const BLOCK_TYPES = ['image', 'video', 'vimeo', 'text'];

function Field({ label, children }) {
  return (
    <label className="crm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// What a pasted link should become
function blockFromLink(src) {
  if (/vimeo\.com\//.test(src)) return { type: 'vimeo', src, aspectRatio: '56.25%' };
  if (isVideoSrc(src)) return { type: 'video', src };
  return { type: 'image', src };
}

function NewPageForm({ onDone }) {
  const doc = useEditor((state) => state.doc);
  const addPage = useEditor((state) => state.addPage);
  const sections = useMemo(() => listSections(doc), [doc]);
  const [title, setTitle] = useState('');
  // Default to the first submenu (Work), where case studies live
  const [sectionId, setSectionId] = useState(sections[1]?.id ?? '');

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    addPage(title.trim(), sectionId || null);
    onDone();
  };

  return (
    <form className="crm-subform" onSubmit={submit}>
      <Field label="Title">
        <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Project name" />
      </Field>
      <Field label="In">
        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
          {sections.map((section) => <option key={section.id ?? ''} value={section.id ?? ''}>{section.title}</option>)}
        </select>
      </Field>
      <div className="crm-buttons">
        <button type="button" onClick={onDone}>Cancel</button>
        <button type="submit" className="primary" disabled={!title.trim()}>Create</button>
      </div>
    </form>
  );
}

function PageSection() {
  const doc = useEditor((state) => state.doc);
  const pageId = useEditor((state) => state.pageId);
  const selectPage = useEditor((state) => state.selectPage);
  const movePage = useEditor((state) => state.movePage);
  const deletePage = useEditor((state) => state.deletePage);
  const page = useCurrentPage();
  const [creating, setCreating] = useState(false);

  // Pages grouped under their menus, in menu order
  const groups = useMemo(() => {
    const map = new Map();
    for (const entry of listPages(doc)) {
      if (!map.has(entry.section)) map.set(entry.section, []);
      map.get(entry.section).push(entry);
    }
    return [...map];
  }, [doc]);

  // Same URL scheme as src/utils/urlSync.js
  const livePath = page && `/${[...page.trail.map((item) => item.id), page.item.id].join('/')}`;

  return (
    <section className="crm-section">
      <div className="crm-section-head">
        <h2>Page</h2>
        {livePath && <a href={livePath} target="_blank" rel="noreferrer">View live ↗</a>}
      </div>
      <select value={pageId ?? ''} onChange={(event) => selectPage(event.target.value)}>
        {groups.map(([section, pages]) => (
          <optgroup key={section} label={section || 'Top level'}>
            {pages.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="crm-buttons">
        <button type="button" title="Move earlier in its menu" disabled={!page} onClick={() => movePage(-1)}>↑</button>
        <button type="button" title="Move later in its menu" disabled={!page} onClick={() => movePage(1)}>↓</button>
        <button type="button" onClick={() => setCreating((open) => !open)}>New page</button>
        <span className="crm-spacer" />
        <button
          type="button"
          className="danger"
          disabled={!page}
          onClick={() => window.confirm(`Delete “${page.item.title}”? You can undo until you save.`) && deletePage()}
        >
          Delete
        </button>
      </div>
      {creating && <NewPageForm onDone={() => setCreating(false)} />}
    </section>
  );
}

function PageFields() {
  const page = useCurrentPage();
  const editContent = useEditor((state) => state.editContent);
  const editPage = useEditor((state) => state.editPage);
  if (!page) return null;
  const { item } = page;
  const content = item.content || {};
  const key = (field) => `${item.id}:${field}`;
  const input = (field, props) => (
    <input value={content[field] ?? ''} onChange={(event) => editContent({ [field]: event.target.value }, key(field))} {...props} />
  );

  return (
    <section className="crm-section">
      <h2>Details</h2>
      <Field label="Title">
        <input
          value={item.title ?? ''}
          onChange={(event) => {
            const title = event.target.value;
            // The menu entry and the page heading share the title
            editPage((current) => ({ ...current, title, content: { ...current.content, title } }), key('title'));
          }}
        />
      </Field>
      {content.isAboutPage ? (
        <Field label="About text (blank lines split paragraphs; “1. ” starts a list)">
          <textarea rows={14} value={content.aboutText ?? ''} onChange={(event) => editContent({ aboutText: event.target.value }, key('aboutText'))} />
        </Field>
      ) : (
        <>
          <div className="crm-pair">
            <Field label="Year">{input('year')}</Field>
            <Field label="Tags">{input('tags', { placeholder: '3D, Motion' })}</Field>
          </div>
          <Field label="Description">
            <textarea rows={4} value={content.description ?? ''} onChange={(event) => editContent({ description: event.target.value }, key('description'))} />
          </Field>
          <Field label="External link">{input('link', { placeholder: 'https://' })}</Field>
          <Field label="Thumbnail in the Work list">{input('thumbnail', { placeholder: 'Select a block and use “Set as thumbnail”' })}</Field>
        </>
      )}
    </section>
  );
}

function AddSection() {
  const addBlock = useEditor((state) => state.addBlock);
  const uploadFiles = useEditor((state) => state.uploadFiles);
  const uploads = useEditor((state) => state.uploads);
  const dismissUpload = useEditor((state) => state.dismissUpload);
  const page = useCurrentPage();
  const [link, setLink] = useState('');
  const fileRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    const src = link.trim();
    if (!src) return;
    addBlock(blockFromLink(src));
    setLink('');
  };

  return (
    <section className="crm-section">
      <h2>Add</h2>
      <form className="crm-inline" onSubmit={submit}>
        <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Paste an image, video or Vimeo link" />
        <button type="submit" disabled={!link.trim() || !page}>Add</button>
      </form>
      <div className="crm-buttons">
        <button type="button" disabled={!page} onClick={() => fileRef.current.click()}>Upload files…</button>
        <button type="button" disabled={!page} onClick={() => addBlock({ type: 'text', content: 'New text' })}>Text</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={(event) => {
          uploadFiles(event.target.files);
          event.target.value = '';
        }}
      />
      {uploads.length > 0 && (
        <ul className="crm-uploads">
          {uploads.map((upload) => (
            <li key={upload.id} className={upload.error ? 'failed' : ''}>
              <span className="crm-upload-name">{upload.name}</span>
              {upload.error ? (
                <>
                  <span className="crm-upload-error">{upload.error}</span>
                  <button type="button" className="crm-link" onClick={() => dismissUpload(upload.id)}>Dismiss</button>
                </>
              ) : (
                <progress value={upload.progress} max={1} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BlockInspector() {
  const page = useCurrentPage();
  const selectedId = useEditor((state) => state.selectedId);
  const select = useEditor((state) => state.select);
  const editRows = useEditor((state) => state.editRows);
  const editContent = useEditor((state) => state.editContent);
  const duplicateSelected = useEditor((state) => state.duplicateSelected);
  const deleteSelected = useEditor((state) => state.deleteSelected);
  const found = page && selectedId ? findBlock(page.item.content?.rows || [], selectedId) : null;
  if (!found) return null;

  const { block } = found;
  const key = (field) => `${block.id}:${field}`;
  const change = (fields, coalesceKey) => editRows((rows) => updateBlock(rows, block.id, fields), coalesceKey);
  const text = (field, props) => (
    <input value={block[field] ?? ''} onChange={(event) => change({ [field]: event.target.value }, key(field))} {...props} />
  );
  const columns = (fields) => editRows((rows) => setColumns(rows, block.id, fields), key('columns'));

  return (
    <section className="crm-section crm-inspector">
      <div className="crm-section-head">
        <h2>Selected block</h2>
        <button type="button" className="crm-link" onClick={() => select(null)}>Done</button>
      </div>
      <Field label="Type">
        <select value={block.type} onChange={(event) => change({ type: event.target.value })}>
          {BLOCK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </Field>
      {block.type === 'text' ? (
        <Field label="Text">
          <textarea rows={4} value={block.content ?? ''} onChange={(event) => change({ content: event.target.value }, key('content'))} />
        </Field>
      ) : (
        <Field label="Link">{text('src', { placeholder: 'https://' })}</Field>
      )}
      <Field label={`Width: ${block.colSpan} of 12 columns`}>
        <input type="range" min={1} max={12} value={block.colSpan} onChange={(event) => columns({ colSpan: Number(event.target.value) })} />
      </Field>
      <Field label={`Starts at column ${block.colStart}`}>
        <input type="range" min={1} max={12} value={block.colStart} onChange={(event) => columns({ colStart: Number(event.target.value) })} />
      </Field>
      {block.type === 'image' && <Field label="Alt text">{text('alt', { placeholder: 'Describe the image' })}</Field>}
      {block.type === 'video' && (
        <div className="crm-pair">
          <Field label="Poster image">{text('poster', { placeholder: 'Automatic for Mux' })}</Field>
          <Field label="Aspect ratio">{text('aspectRatio', { placeholder: '16 / 9' })}</Field>
        </div>
      )}
      {block.type === 'vimeo' && <Field label="Height as % of width">{text('aspectRatio', { placeholder: '56.25%' })}</Field>}
      <div className="crm-buttons">
        {block.type !== 'text' && block.src && (
          <button type="button" onClick={() => editContent({ thumbnail: block.src })}>Set as thumbnail</button>
        )}
        <button type="button" title="⌘D" onClick={duplicateSelected}>Duplicate</button>
        <span className="crm-spacer" />
        <button type="button" className="danger" title="Delete key" onClick={deleteSelected}>Delete</button>
      </div>
    </section>
  );
}

function HistorySection({ onClose }) {
  const restore = useEditor((state) => state.restore);
  const revision = useEditor((state) => state.revision);
  const [revisions, setRevisions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory().then((data) => setRevisions(data.revisions), (err) => setError(err.message));
  }, [revision]);

  const when = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <section className="crm-section">
      <div className="crm-section-head">
        <h2>History</h2>
        <button type="button" className="crm-link" onClick={onClose}>Close</button>
      </div>
      {error && <p className="crm-error">{error}</p>}
      {!revisions && !error && <p className="crm-muted">Loading…</p>}
      {revisions?.length === 0 && <p className="crm-muted">Nothing saved yet.</p>}
      {revisions?.length > 0 && (
        <ul className="crm-history">
          {revisions.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>#{entry.id}</strong> {when(entry.created_at)}
                {entry.id === revision && <span className="crm-live"> · live</span>}
                {entry.note && <p>{entry.note}</p>}
              </div>
              <button type="button" disabled={entry.id === revision} onClick={() => restore(entry.id)}>Load</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Footer({ onShowHistory, onSignedOut }) {
  const undo = useEditor((state) => state.undo);
  const redo = useEditor((state) => state.redo);
  const save = useEditor((state) => state.save);
  const cancel = useEditor((state) => state.cancel);
  const canUndo = useEditor((state) => state.past.length > 0);
  const canRedo = useEditor((state) => state.future.length > 0);
  const saving = useEditor((state) => state.saving);
  const notice = useEditor((state) => state.notice);
  const backend = useEditor((state) => state.backend);
  const revision = useEditor((state) => state.revision);
  const dirty = useIsDirty();

  const leave = async () => {
    if (dirty && !window.confirm('Sign out and lose your unsaved changes?')) return;
    await signOut().catch(() => {});
    onSignedOut();
  };

  return (
    <footer className="crm-footer">
      {notice && <p className={`crm-notice ${notice.kind}`}>{notice.text}</p>}
      <div className="crm-buttons">
        <button type="button" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>Undo</button>
        <button type="button" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>Redo</button>
        <span className="crm-spacer" />
        <button type="button" title="Go back to what’s live" disabled={!dirty} onClick={cancel}>Cancel</button>
        <button type="button" className="primary" title="Save (⌘S)" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="crm-meta">
        <span>
          {dirty ? 'Unsaved changes' : revision ? `Live: revision ${revision}` : 'Not saved yet'}
          {backend === 'local' && ' · saving to .crm-local'}
        </span>
        <span className="crm-spacer" />
        <button type="button" className="crm-link" onClick={onShowHistory}>History</button>
        <button type="button" className="crm-link" onClick={leave}>Sign out</button>
      </div>
    </footer>
  );
}

// The editor's left column: what's on the page, what's selected, and saving
function Sidebar({ onSignedOut }) {
  const [showHistory, setShowHistory] = useState(false);
  return (
    <aside className="crm-pane">
      <header className="crm-header">
        <span className="crm-title">Henry Allan</span>
        <span className="crm-subtitle">Site editor</span>
      </header>
      <div className="crm-pane-scroll">
        {showHistory && <HistorySection onClose={() => setShowHistory(false)} />}
        <PageSection />
        <BlockInspector />
        <AddSection />
        <PageFields />
      </div>
      <Footer onShowHistory={() => setShowHistory(true)} onSignedOut={onSignedOut} />
    </aside>
  );
}

export default Sidebar;
