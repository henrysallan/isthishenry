import { useEffect } from 'react';
import Canvas from './Canvas';
import { findBlock, setColumns } from './layout';
import Sidebar from './Sidebar';
import { useEditor } from './store';

// Keyboard: ⌘S save, ⌘Z / ⇧⌘Z undo and redo, and for the selected block
// Delete, ⌘D duplicate, ←/→ move a column, ⇧←/⇧→ narrow or widen, Esc deselect.
// Typing in a field keeps its own keys (except ⌘S).
function useShortcuts() {
  useEffect(() => {
    const onKey = (event) => {
      const editor = useEditor.getState();
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === 's') {
        event.preventDefault();
        editor.save();
        return;
      }
      if (event.target.closest?.('input, textarea, select')) return;
      if (mod && (key === 'z' || key === 'y')) {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      const id = editor.selectedId;
      if (!id) return;
      if (event.key === 'Escape') editor.select(null);
      else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        editor.deleteSelected();
      } else if (mod && key === 'd') {
        event.preventDefault();
        editor.duplicateSelected();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        editor.editRows((rows) => {
          const { block } = findBlock(rows, id) || {};
          if (!block) return rows;
          return setColumns(rows, id, event.shiftKey ? { colSpan: block.colSpan + step } : { colStart: block.colStart + step });
        }, `${id}:columns`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

// Leaving or reloading with unsaved changes asks first
function useUnsavedWarning() {
  useEffect(() => {
    const onBeforeUnload = (event) => {
      const { doc, savedDoc } = useEditor.getState();
      if (doc !== savedDoc) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
}

function Editor({ onSignedOut }) {
  const status = useEditor((state) => state.status);
  const error = useEditor((state) => state.error);
  const load = useEditor((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);
  useShortcuts();
  useUnsavedWarning();

  if (status === 'loading') return <div className="crm-message">Loading the site…</div>;
  if (status === 'error') {
    return (
      <div className="crm-message">
        <p>Couldn’t load the site: {error}</p>
        <button type="button" onClick={load}>Try again</button>
      </div>
    );
  }
  return (
    <div className="crm">
      <Sidebar onSignedOut={onSignedOut} />
      <Canvas />
    </div>
  );
}

export default Editor;
