import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzySearch } from './fuzzySearch';

const items = [
  { id: 'expensify', title: 'Expensify', content: { tags: '3D, Motion' } },
  { id: 'smokeye', title: 'Smokeye Hill', content: { tags: 'Visual Design, Motion, 3D' } },
  { id: 'kalshi', title: 'Kalshi', content: { tags: '3D, Motion, VFX', description: 'Produced VFX for top markets' } },
  { id: 'mschf', title: 'MSCHF', content: { tags: '3D, Motion, Brand' } },
];

describe('fuzzyScore', () => {
  it('matches characters in order and rejects out-of-order ones', () => {
    expect(fuzzyScore('xpsfy', 'Expensify')).toBeGreaterThan(0);
    expect(fuzzyScore('yfx', 'Expensify')).toBe(-1);
  });

  it('ranks a contiguous match above a scattered one', () => {
    expect(fuzzyScore('hill', 'Smokeye Hill')).toBeGreaterThan(fuzzyScore('sye', 'Smokeye Hill'));
  });

  it('forgives a typo or two in longer words, but not in short ones', () => {
    expect(fuzzyScore('poetyr', 'Poetry Map')).toBeGreaterThan(0); // swapped letters
    expect(fuzzyScore('expansify', 'Expensify')).toBeGreaterThan(0); // wrong letter
    expect(fuzzyScore('smokye hil', 'Smokeye Hill')).toBeGreaterThan(0); // missing letters
    expect(fuzzyScore('kla', 'Kalshi')).toBe(-1);
    expect(fuzzyScore('qqqq', 'Kalshi')).toBe(-1);
  });

  it('ranks in-order matches above typo matches', () => {
    expect(fuzzyScore('kalsh', 'Kalshi')).toBeGreaterThan(fuzzyScore('kalhs', 'Kalshi'));
  });

  it('ignores case and spaces', () => {
    expect(fuzzyScore('SMOKEYEHILL', 'Smokeye Hill')).toBeGreaterThan(0);
    expect(fuzzyScore('smo hill', 'Smokeye Hill')).toBeGreaterThan(0);
  });
});

describe('fuzzySearch', () => {
  it('returns every item for an empty query', () => {
    expect(fuzzySearch(items, '  ')).toBe(items);
  });

  it('finds items by fuzzy title', () => {
    expect(fuzzySearch(items, 'kls').map(i => i.id)).toEqual(['kalshi']);
  });

  it('finds items by tag and keeps their order on ties', () => {
    expect(fuzzySearch(items, 'brand').map(i => i.id)).toEqual(['mschf']);
    expect(fuzzySearch(items, 'motion').map(i => i.id)).toEqual(['expensify', 'smokeye', 'kalshi', 'mschf']);
  });

  it('matches descriptions only as a substring', () => {
    expect(fuzzySearch(items, 'top markets').map(i => i.id)).toEqual(['kalshi']);
    expect(fuzzySearch(items, 'pdcd').map(i => i.id)).toEqual([]);
  });
});
