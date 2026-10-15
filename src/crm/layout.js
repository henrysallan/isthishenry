// Row and block operations for the editor. Pure functions over a page's rows
// (see src/data/siteDoc.js): each returns new arrays and leaves its input alone,
// so every edit can go on the undo stack.
import { GRID_COLUMNS, newId } from '../data/siteDoc';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const end = (block) => block.colStart + block.colSpan - 1;
const byColumn = (a, b) => a.colStart - b.colStart;

export function findBlock(rows, blockId) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const block = rows[rowIndex].blocks.find((b) => b.id === blockId);
    if (block) return { row: rows[rowIndex], rowIndex, block };
  }
  return null;
}

// Runs of empty columns in a row, as [first, last] pairs, ignoring one block
export function freeRanges(row, ignoreId = null) {
  const ranges = [];
  let next = 1;
  for (const block of [...row.blocks].sort(byColumn)) {
    if (block.id === ignoreId) continue;
    if (block.colStart > next) ranges.push([next, block.colStart - 1]);
    next = Math.max(next, end(block) + 1);
  }
  if (next <= GRID_COLUMNS) ranges.push([next, GRID_COLUMNS]);
  return ranges;
}

// Where a block colSpan wide, wanted at colStart, lands in a row: inside the free
// run under the pointer column (or the nearest one), shrunk to fit it. Null when
// the row has no room.
export function placeInRow(row, { colStart, colSpan, pointerColumn = colStart, ignoreId = null }) {
  const ranges = freeRanges(row, ignoreId);
  if (!ranges.length) return null;
  const distance = ([first, last]) => (pointerColumn < first ? first - pointerColumn : pointerColumn > last ? pointerColumn - last : 0);
  const [first, last] = ranges.reduce((best, range) => (distance(range) < distance(best) ? range : best));
  const span = Math.min(colSpan, last - first + 1);
  return { colStart: clamp(colStart, first, last - span + 1), colSpan: span };
}

const dropEmpty = (rows) => rows.filter((row) => row.blocks.length);

function replaceBlock(rows, blockId, fn) {
  return rows.map((row) =>
    row.blocks.some((b) => b.id === blockId)
      ? { ...row, blocks: row.blocks.map((b) => (b.id === blockId ? fn(b) : b)).sort(byColumn) }
      : row,
  );
}

// Moves a block to { rowId, colStart, colSpan } in an existing row, or to
// { newRowAt, colStart, colSpan }: a new row inserted before that index of the
// current rows. Rows left empty are removed.
export function moveBlock(rows, blockId, target) {
  const found = findBlock(rows, blockId);
  if (!found) return rows;
  const moved = { ...found.block, colStart: target.colStart, colSpan: target.colSpan };
  // Take the block out but keep its row for now, so newRowAt still lines up
  let next = rows.map((row) => (row === found.row ? { ...row, blocks: row.blocks.filter((b) => b.id !== blockId) } : row));
  if (target.rowId) {
    next = next.map((row) => (row.id === target.rowId ? { ...row, blocks: [...row.blocks, moved].sort(byColumn) } : row));
  } else {
    next.splice(clamp(target.newRowAt, 0, next.length), 0, { id: newId('r'), blocks: [moved] });
  }
  return dropEmpty(next);
}

// Drags one edge of a block to a column boundary (0–12: the number of columns
// left of it), stopping at its neighbours and at one column wide
export function resizeBlock(rows, blockId, edge, boundary) {
  const found = findBlock(rows, blockId);
  if (!found) return rows;
  const { block, row } = found;
  const others = row.blocks.filter((b) => b.id !== blockId);
  if (edge === 'right') {
    const limit = Math.min(GRID_COLUMNS, ...others.filter((b) => b.colStart > end(block)).map((b) => b.colStart - 1));
    const last = clamp(boundary, block.colStart, limit);
    return replaceBlock(rows, blockId, (b) => ({ ...b, colSpan: last - b.colStart + 1 }));
  }
  const limit = Math.max(1, ...others.filter((b) => end(b) < block.colStart).map((b) => end(b) + 1));
  const first = clamp(boundary + 1, limit, end(block));
  return replaceBlock(rows, blockId, (b) => ({ ...b, colStart: first, colSpan: end(b) - first + 1 }));
}

// Sets a block's columns from the inspector, kept inside the free run it sits in
export function setColumns(rows, blockId, { colStart, colSpan }) {
  const found = findBlock(rows, blockId);
  if (!found) return rows;
  const placed = placeInRow(found.row, {
    colStart: clamp(colStart ?? found.block.colStart, 1, GRID_COLUMNS),
    colSpan: clamp(colSpan ?? found.block.colSpan, 1, GRID_COLUMNS),
    pointerColumn: found.block.colStart,
    ignoreId: blockId,
  });
  return replaceBlock(rows, blockId, (b) => ({ ...b, ...placed }));
}

export function updateBlock(rows, blockId, fields) {
  return replaceBlock(rows, blockId, (b) => ({ ...b, ...fields }));
}

export function removeBlock(rows, blockId) {
  return dropEmpty(rows.map((row) => ({ ...row, blocks: row.blocks.filter((b) => b.id !== blockId) })));
}

// A full-width-or-given block on a new row, after rowIndex (default: at the end)
export function addBlockRow(rows, block, afterRowIndex = rows.length - 1) {
  const next = [...rows];
  next.splice(afterRowIndex + 1, 0, { id: newId('r'), blocks: [{ colStart: 1, colSpan: GRID_COLUMNS, ...block, id: newId('b') }] });
  return next;
}

// A copy on its own row just below, at the same columns. Returns [rows, copy id].
export function duplicateBlock(rows, blockId) {
  const found = findBlock(rows, blockId);
  if (!found) return [rows, null];
  const next = addBlockRow(rows, found.block, found.rowIndex);
  return [next, next[found.rowIndex + 1].blocks[0].id];
}

export function moveRow(rows, rowId, delta) {
  const index = rows.findIndex((row) => row.id === rowId);
  const to = index + delta;
  if (index < 0 || to < 0 || to >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export function removeRow(rows, rowId) {
  return rows.filter((row) => row.id !== rowId);
}
