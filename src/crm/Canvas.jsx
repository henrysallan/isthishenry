import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GRID_COLUMNS } from '../data/siteDoc';
import BlockPreview from './BlockPreview';
import { findBlock, moveBlock, moveRow, placeInRow, removeRow, resizeBlock } from './layout';
import { useCurrentPage, useEditor } from './store';

// Pointer travel before a press on a block becomes a drag
const DRAG_THRESHOLD = 4;
// Pointer this close to a row's top or bottom edge means "new row here"
const ROW_EDGE = 18;
const GHOST_MAX_WIDTH = 220;
// Dragging this close to the top or bottom of the page scrolls it
const SCROLL_ZONE = 60;
const SCROLL_SPEED = 14;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Column geometry of the grid: its box, the gap, and the width of a column plus a gap
function measure(grid) {
  const rect = grid.getBoundingClientRect();
  const row = grid.querySelector('[data-row-id]');
  const gap = row ? parseFloat(getComputedStyle(row).columnGap) || 0 : 10;
  return { rect, gap, step: (rect.width + gap) / GRID_COLUMNS };
}

const columnAt = (x, m) => clamp(Math.floor((x - m.rect.left) / m.step) + 1, 1, GRID_COLUMNS);
// The column line nearest x, as the number of columns to its left (0–12)
const boundaryAt = (x, m) => clamp(Math.round((x - m.rect.left + m.gap / 2) / m.step), 0, GRID_COLUMNS);

// Where a dragged block would land with the pointer at (x, y): a free spot in
// the row under it, or a new row in the gap between rows. Null if that row is full.
function dropTarget(grid, rows, drag, x, y) {
  const m = measure(grid);
  const { block, grabColumn } = drag;
  const pointerColumn = columnAt(x, m);
  const colStart = clamp(pointerColumn - grabColumn, 1, GRID_COLUMNS + 1 - block.colSpan);
  const rowEls = [...grid.querySelectorAll(':scope > [data-row-id]')];
  const newRow = (index) => {
    const y = index < rowEls.length
      ? rowEls[index].getBoundingClientRect().top - m.gap / 2
      : (rowEls.at(-1)?.getBoundingClientRect().bottom ?? m.rect.top) + m.gap / 2;
    return {
      newRowAt: index,
      colStart,
      colSpan: block.colSpan,
      line: { top: y - m.rect.top, left: (colStart - 1) * m.step, width: block.colSpan * m.step - m.gap },
    };
  };
  for (let i = 0; i < rowEls.length; i++) {
    const box = rowEls[i].getBoundingClientRect();
    const edge = Math.min(ROW_EDGE, box.height / 4);
    if (y < box.top + edge) return newRow(i);
    if (y <= box.bottom - edge) {
      const row = rows.find((r) => r.id === rowEls[i].dataset.rowId);
      const placed = placeInRow(row, { colStart, colSpan: block.colSpan, pointerColumn, ignoreId: block.id });
      return placed && { rowId: row.id, ...placed };
    }
  }
  return newRow(rowEls.length);
}

// True when dropping there would leave the block where it is
function isNoop(rows, blockId, target) {
  const found = findBlock(rows, blockId);
  if (!found) return true;
  const sameColumns = target.colStart === found.block.colStart && target.colSpan === found.block.colSpan;
  if (target.rowId) return sameColumns && target.rowId === found.row.id;
  return sameColumns && found.row.blocks.length === 1 && [found.rowIndex, found.rowIndex + 1].includes(target.newRowAt);
}

// The page being edited, laid out as the site shows it. Blocks are still
// thumbnails: drag one to move it (into a gap in a row, or between rows for a
// row of its own), drag its side edges to change how many columns it spans.
function Canvas() {
  const page = useCurrentPage();
  const rows = page?.item.content?.rows;
  const selectedId = useEditor((state) => state.selectedId);
  const revealId = useEditor((state) => state.revealId);
  const select = useEditor((state) => state.select);
  const editRows = useEditor((state) => state.editRows);
  const uploadFiles = useEditor((state) => state.uploadFiles);

  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const rowsRef = useRef(rows);
  const gestureRef = useRef(null);
  // What the current gesture shows: { kind: 'drag', ... } or { kind: 'resize', ... }
  const [view, setView] = useState(null);
  const [filesOver, setFilesOver] = useState(false);

  useLayoutEffect(() => {
    rowsRef.current = rows || [];
  });

  // Pointer tracking for drags and resizes. The listeners stay on the window
  // and only act while a gesture is under way.
  useEffect(() => {
    let pointer = null;
    let frame = 0;

    const update = () => {
      const gesture = gestureRef.current;
      if (!gesture || !pointer) return;
      if (gesture.kind === 'resize') {
        gesture.boundary = boundaryAt(pointer.x, measure(gridRef.current));
        const { block } = findBlock(resizeBlock(rowsRef.current, gesture.block.id, gesture.edge, gesture.boundary), gesture.block.id);
        setView({ kind: 'resize', blockId: block.id, colStart: block.colStart, colSpan: block.colSpan });
        return;
      }
      if (gesture.kind === 'press') {
        if (Math.hypot(pointer.x - gesture.startX, pointer.y - gesture.startY) < DRAG_THRESHOLD) return;
        gesture.kind = 'drag';
      }
      gesture.target = dropTarget(gridRef.current, rowsRef.current, gesture, pointer.x, pointer.y);
      setView({ kind: 'drag', blockId: gesture.block.id, x: pointer.x, y: pointer.y, target: gesture.target, ghost: gesture.ghost });
    };

    const autoScroll = () => {
      frame = 0;
      if (gestureRef.current?.kind !== 'drag' || !pointer) return;
      const box = scrollRef.current.getBoundingClientRect();
      const delta = pointer.y < box.top + SCROLL_ZONE ? -SCROLL_SPEED : pointer.y > box.bottom - SCROLL_ZONE ? SCROLL_SPEED : 0;
      if (!delta) return;
      scrollRef.current.scrollTop += delta;
      update();
      frame = requestAnimationFrame(autoScroll);
    };

    const onMove = (event) => {
      if (!gestureRef.current) return;
      pointer = { x: event.clientX, y: event.clientY };
      update();
      if (gestureRef.current.kind === 'drag' && !frame) frame = requestAnimationFrame(autoScroll);
    };

    const finish = (commit) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      gestureRef.current = null;
      pointer = null;
      cancelAnimationFrame(frame);
      frame = 0;
      setView(null);
      if (!commit) return;
      const { editRows: edit } = useEditor.getState();
      if (gesture.kind === 'resize' && gesture.boundary != null) {
        edit((current) => resizeBlock(current, gesture.block.id, gesture.edge, gesture.boundary));
      }
      if (gesture.kind === 'drag' && gesture.target) {
        edit((current) => (isNoop(current, gesture.block.id, gesture.target) ? current : moveBlock(current, gesture.block.id, gesture.target)));
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event) => {
      if (event.key === 'Escape' && gestureRef.current) {
        event.stopPropagation();
        finish(false);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  // Newly added blocks scroll into view
  useEffect(() => {
    if (!revealId) return;
    gridRef.current?.querySelector(`[data-block-id="${revealId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [revealId]);

  const startPress = (event, block) => {
    if (event.button !== 0) return;
    // No text selection or native image drag; and let go of any focused field
    // so keyboard shortcuts act on the block
    event.preventDefault();
    document.activeElement?.blur?.();
    select(block.id);
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(1, GHOST_MAX_WIDTH / rect.width);
    gestureRef.current = {
      kind: 'press',
      block,
      startX: event.clientX,
      startY: event.clientY,
      grabColumn: clamp(columnAt(event.clientX, measure(gridRef.current)) - block.colStart, 0, block.colSpan - 1),
      ghost: {
        width: rect.width * scale,
        height: rect.height * scale,
        offsetX: (event.clientX - rect.left) * scale,
        offsetY: (event.clientY - rect.top) * scale,
      },
    };
  };

  const startResize = (event, block, edge) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    document.activeElement?.blur?.();
    select(block.id);
    gestureRef.current = { kind: 'resize', block, edge };
    setView({ kind: 'resize', blockId: block.id, colStart: block.colStart, colSpan: block.colSpan });
  };

  const hasFiles = (event) => event.dataTransfer?.types.includes('Files');
  const dropHandlers = {
    onDragOver: (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setFilesOver(true);
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFilesOver(false);
    },
    onDrop: (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setFilesOver(false);
      uploadFiles(event.dataTransfer.files);
    },
  };

  if (!page) return <div className="content-area crm-canvas" />;

  const dragging = view?.kind === 'drag' ? view : null;
  const draggedBlock = dragging && findBlock(rows, dragging.blockId)?.block;
  const ghost = dragging?.ghost;

  return (
    <div className={`content-area crm-canvas${view ? ` crm-${view.kind}` : ''}`} {...dropHandlers}>
      <div
        className="content-inner"
        ref={scrollRef}
        onPointerDown={(event) => {
          if (!event.target.closest('.crm-block, .crm-row-tools')) select(null);
        }}
      >
        <div className="page-content">
          {!rows?.length && (
            <div className="crm-empty">
              <p>No blocks on {page.item.title} yet.</p>
              <p>Paste a link or upload files on the left, or drop files here.</p>
            </div>
          )}
          <div className="blocks-grid crm-grid" ref={gridRef}>
            {view && (
              <div className="crm-guides" aria-hidden="true">
                {Array.from({ length: GRID_COLUMNS }, (_, i) => <span key={i} />)}
              </div>
            )}
            {rows?.map((row, index) => (
              <div key={row.id} className="blocks-row crm-row" data-row-id={row.id}>
                {row.blocks.map((block) => {
                  const columns = view?.kind === 'resize' && view.blockId === block.id ? view : block;
                  const classes = [
                    'block-item',
                    'crm-block',
                    block.type === 'text' && 'block-text',
                    block.id === selectedId && 'selected',
                    block.id === dragging?.blockId && 'lifted',
                  ].filter(Boolean).join(' ');
                  return (
                    <div
                      key={block.id}
                      data-block-id={block.id}
                      className={classes}
                      style={{ gridColumn: `${columns.colStart} / span ${columns.colSpan}`, gridRow: 1 }}
                      onPointerDown={(event) => startPress(event, block)}
                    >
                      <BlockPreview block={block} />
                      <span className="crm-handle left" title="Drag to resize" onPointerDown={(event) => startResize(event, block, 'left')} />
                      <span className="crm-handle right" title="Drag to resize" onPointerDown={(event) => startResize(event, block, 'right')} />
                      {(block.id === selectedId || columns === view) && (
                        <span className="crm-span-label">{columns.colSpan}/{GRID_COLUMNS}</span>
                      )}
                    </div>
                  );
                })}
                {dragging?.target?.rowId === row.id && (
                  <div
                    className="crm-drop-slot"
                    style={{ gridColumn: `${dragging.target.colStart} / span ${dragging.target.colSpan}`, gridRow: 1 }}
                  />
                )}
                <div className="crm-row-tools">
                  <button type="button" title="Move row up" disabled={index === 0} onClick={() => editRows((r) => moveRow(r, row.id, -1))}>↑</button>
                  <button type="button" title="Move row down" disabled={index === rows.length - 1} onClick={() => editRows((r) => moveRow(r, row.id, 1))}>↓</button>
                  <button type="button" title="Delete row" onClick={() => editRows((r) => removeRow(r, row.id))}>×</button>
                </div>
              </div>
            ))}
            {dragging?.target?.line && <div className="crm-drop-line" style={dragging.target.line} />}
          </div>
        </div>
      </div>
      {dragging && draggedBlock && ghost && (
        <div
          className={`crm-ghost${draggedBlock.type === 'text' ? ' block-text' : ''}${dragging.target ? '' : ' blocked'}`}
          style={{ left: dragging.x - ghost.offsetX, top: dragging.y - ghost.offsetY, width: ghost.width, height: ghost.height }}
        >
          <BlockPreview block={draggedBlock} />
        </div>
      )}
      {filesOver && <div className="crm-file-drop">Drop to upload to this page</div>}
    </div>
  );
}

export default Canvas;
