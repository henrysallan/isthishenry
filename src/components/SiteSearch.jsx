import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { fuzzySearch } from '../utils/fuzzySearch';
import { getSiteIndex } from '../utils/siteIndex';
import SearchField from './SearchField';
import './SiteSearch.css';

const MAX_RESULTS = 8;
const ASK_ENDPOINT = '/api/ask';

function SendArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8 H13 M9 4 L13 8 L9 12" />
    </svg>
  );
}

// Search bar at the bottom of the left column. As you type, matching pages from
// across the site show in a panel above it. Enter (or the arrow) sends the text
// to the site assistant (api/ask.js), whose answer replaces the matches along
// with the pages it points to. Up/down pick a page and Enter opens it; Escape
// clears.
function SiteSearch() {
  const navigateTo = useNavigationStore(state => state.navigateTo);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  // -1 until a page is picked with the arrow keys or the mouse; Enter then
  // opens it instead of asking
  const [activeIndex, setActiveIndex] = useState(-1);
  // The assistant's reply to the current text: { status: 'loading' | 'done' | 'error', answer, pages }
  const [reply, setReply] = useState(null);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const siteIndex = getSiteIndex();
  const matches = useMemo(() => fuzzySearch(siteIndex, query).slice(0, MAX_RESULTS), [siteIndex, query]);
  const rows = reply
    ? (reply.pages || []).map(id => siteIndex.find(entry => entry.id === id)).filter(Boolean)
    : matches;
  const showPanel = focused && query.trim() !== '';

  const updateQuery = (value) => {
    requestRef.current?.abort();
    setReply(null);
    setQuery(value);
    setActiveIndex(-1);
  };

  const open = (entry) => {
    navigateTo(entry.id);
    updateQuery('');
    document.activeElement?.blur();
  };

  const ask = async () => {
    const question = query.trim();
    if (!question || reply?.status === 'loading') return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setReply({ status: 'loading' });
    setActiveIndex(-1);
    try {
      const response = await fetch(ASK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.answer) throw new Error(data.error);
      setReply({ status: 'done', answer: data.answer, pages: data.pages });
    } catch (error) {
      if (error.name === 'AbortError') return;
      setReply({ status: 'error', answer: error.message || 'Couldn’t answer that right now.' });
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && showPanel && rows.length > 0) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(i => (i === -1 ? (step === 1 ? 0 : rows.length - 1) : (i + step + rows.length) % rows.length));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && rows[activeIndex]) open(rows[activeIndex]);
      else ask();
    } else if (e.key === 'Escape') {
      updateQuery('');
    }
  };

  return (
    <div className={`site-search${showPanel ? ' is-searching' : ''}`}>
      {showPanel && (
        <div className="site-search-results" id="site-search-results" role="listbox" aria-label="Search results">
          {reply && (
            <p className={`site-search-answer is-${reply.status}`} aria-live="polite">
              {reply.status === 'loading' ? 'Thinking…' : reply.answer}
            </p>
          )}
          {!reply && matches.length === 0 && (
            <p className="site-search-empty">No matching pages. Press Enter to ask.</p>
          )}
          {rows.map((entry, i) => {
            const meta = [entry.section, entry.content.tags].filter(Boolean).join(' · ');
            return (
              <button
                key={entry.id}
                id={`site-search-result-${i}`}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`site-search-result${i === activeIndex ? ' is-active' : ''}`}
                // Keep focus in the field so the panel stays open until the click lands
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(-1)}
                onClick={() => open(entry)}
              >
                <span className="site-search-result-title">{entry.title}</span>
                {meta && <span className="site-search-result-meta">{meta}</span>}
              </button>
            );
          })}
        </div>
      )}
      <SearchField
        label="Ask about Henry or search the site"
        value={query}
        onChange={(e) => updateQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onClear={() => updateQuery('')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        icon={<SendArrowIcon />}
        onIconClick={ask}
        iconLabel="Ask"
        inputProps={{
          role: 'combobox',
          'aria-expanded': showPanel,
          'aria-controls': 'site-search-results',
          'aria-activedescendant': showPanel && rows[activeIndex] ? `site-search-result-${activeIndex}` : undefined,
        }}
      />
    </div>
  );
}

export default SiteSearch;
