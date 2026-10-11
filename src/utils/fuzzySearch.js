const WORD_BREAK = /[\s,/&-]/;
const isWordStart = (text, i) => i === 0 || WORD_BREAK.test(text[i - 1]);

// Edits to turn one word into another, counting a swap of neighbouring letters
// as one edit (optimal string alignment distance)
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Typos forgiven in a query word of this length; short words must be exact
const allowedTypos = (length) => (length >= 8 ? 2 : length >= 4 ? 1 : 0);

// Fallback for misspellings ("poetyr", "expansify"): every query word must be
// within its typo allowance of a word in the text, or of a word's start
function typoScore(queryWords, text) {
  const textWords = text.split(/[\s,/&-]+/).filter(Boolean);
  let score = 0;
  for (const word of queryWords) {
    const allowed = allowedTypos(word.length);
    if (allowed === 0) return -1;
    let best = Infinity;
    for (const candidate of textWords) {
      best = Math.min(best, editDistance(word, candidate), editDistance(word, candidate.slice(0, word.length)));
    }
    if (best > allowed) return -1;
    score += 20 - best * 6;
  }
  return score;
}

// How well `query` matches `text`, or -1 for no match. A contiguous substring
// beats a scattered one, and one starting a word beats one inside a word;
// otherwise the query's characters must appear in order, scoring extra for runs
// of adjacent characters and for word starts. Failing that, words with a typo
// or two still match, scoring lowest.
export function fuzzyScore(query, text) {
  const q = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const t = (text || '').toLowerCase();
  if (!q) return 0;
  if (!t) return -1;

  const substring = t.indexOf(q);
  if (substring !== -1) return 1000 + (isWordStart(t, substring) ? 100 : 0);

  let score = 0;
  let from = 0;
  let run = 0;
  for (const ch of q.replace(/ /g, '')) {
    const found = t.indexOf(ch, from);
    if (found === -1) return typoScore(q.split(' '), t);
    run = found === from ? run + 1 : 0;
    score += 1 + run * 2 + (isWordStart(t, found) ? 3 : 0);
    from = found + 1;
  }
  return score;
}

// Items matching `query`, best first; ties keep their original order. Titles
// count double. Descriptions only match on a contiguous substring, since
// scattered letters turn up in almost any paragraph.
export function fuzzySearch(items, query) {
  if (!query.trim()) return items;
  const q = query.trim().toLowerCase();
  return items
    .map((item, index) => {
      const description = item.content?.description?.toLowerCase() || '';
      const score = Math.max(
        fuzzyScore(query, item.title) * 2,
        fuzzyScore(query, item.content?.tags),
        description.includes(q) ? 1 : -1,
      );
      return { item, index, score };
    })
    .filter(result => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(result => result.item);
}
