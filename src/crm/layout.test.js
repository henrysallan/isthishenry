import { describe, it, expect } from 'vitest';
import { validateDoc } from '../data/siteDoc';
import { addBlockRow, duplicateBlock, freeRanges, moveBlock, placeInRow, removeBlock, resizeBlock, setColumns } from './layout';

const block = (id, colStart, colSpan) => ({ id, type: 'image', src: `${id}.jpg`, colStart, colSpan });
// Row r1: a [1–6], b [9–12]; row r2: c full width
const page = () => [
  { id: 'r1', blocks: [block('a', 1, 6), block('b', 9, 4)] },
  { id: 'r2', blocks: [block('c', 1, 12)] },
];
const columns = (rows) => rows.map((row) => row.blocks.map((b) => `${b.id}:${b.colStart}+${b.colSpan}`).join(' '));

describe('freeRanges / placeInRow', () => {
  it('finds the gaps between blocks', () => {
    expect(freeRanges(page()[0])).toEqual([[7, 8]]);
    expect(freeRanges(page()[0], 'b')).toEqual([[7, 12]]);
    expect(freeRanges(page()[1])).toEqual([]);
  });

  it('shrinks a block to fit the gap under the pointer', () => {
    expect(placeInRow(page()[0], { colStart: 5, colSpan: 6, pointerColumn: 7 })).toEqual({ colStart: 7, colSpan: 2 });
  });

  it('has no room in a full row', () => {
    expect(placeInRow(page()[1], { colStart: 1, colSpan: 4 })).toBeNull();
  });
});

describe('moveBlock', () => {
  it('moves into another row and drops the row it emptied', () => {
    const rows = moveBlock(page(), 'c', { rowId: 'r1', colStart: 7, colSpan: 2 });
    expect(columns(rows)).toEqual(['a:1+6 c:7+2 b:9+4']);
  });

  it('opens a new row at an index of the current rows', () => {
    const rows = moveBlock(page(), 'b', { newRowAt: 2, colStart: 3, colSpan: 4 });
    expect(columns(rows)).toEqual(['a:1+6', 'c:1+12', 'b:3+4']);
  });

  it('keeps indexes right when the source row empties', () => {
    const rows = moveBlock(page(), 'c', { newRowAt: 0, colStart: 1, colSpan: 12 });
    expect(columns(rows)).toEqual(['c:1+12', 'a:1+6 b:9+4']);
  });
});

describe('resizeBlock / setColumns', () => {
  it('stops at the neighbouring block', () => {
    expect(columns(resizeBlock(page(), 'a', 'right', 11))[0]).toBe('a:1+8 b:9+4');
    expect(columns(resizeBlock(page(), 'b', 'left', 2))[0]).toBe('a:1+6 b:7+6');
  });

  it('never goes below one column', () => {
    expect(columns(resizeBlock(page(), 'a', 'right', 0))[0]).toBe('a:1+1 b:9+4');
  });

  it('keeps inspector changes inside the free space', () => {
    expect(columns(setColumns(page(), 'a', { colSpan: 12 }))[0]).toBe('a:1+8 b:9+4');
    expect(columns(setColumns(page(), 'b', { colStart: 1 }))[0]).toBe('a:1+6 b:7+4');
  });
});

describe('adding and removing', () => {
  it('adds full-width blocks on new rows and duplicates below', () => {
    const added = addBlockRow(page(), { type: 'text', content: 'Hi' }, 0);
    expect(columns(added)[1]).toMatch(/:1\+12$/);
    const [rows, copyId] = duplicateBlock(page(), 'b');
    expect(rows[1].blocks[0]).toMatchObject({ id: copyId, colStart: 9, colSpan: 4 });
  });

  it('removes a row once its last block goes', () => {
    expect(columns(removeBlock(page(), 'c'))).toEqual(['a:1+6 b:9+4']);
  });

  it('only produces documents that validate', () => {
    let rows = page();
    rows = moveBlock(rows, 'c', { rowId: 'r1', colStart: 7, colSpan: 2 });
    rows = resizeBlock(rows, 'a', 'right', 12);
    rows = duplicateBlock(rows, 'b')[0];
    const doc = { version: 2, home: { content: {} }, mainMenu: [{ id: 'p', type: 'page', content: { rows } }] };
    expect(validateDoc(doc)).toEqual([]);
  });
});
