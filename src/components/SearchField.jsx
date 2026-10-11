import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import './SearchField.css';

// Search field with a magnifier, a drawn caret and a clear button. Used by the
// work lists and the site search in the left column.
//
// The native caret and clear button can't be thickened or rounded, so they're
// hidden and drawn here instead. The caret hides while text is selected.
let caretMeasureCtx = null;
// Extra room between the last typed character and the caret
const CARET_END_GAP = 3;

function MagnifierIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11 L14 14" />
    </svg>
  );
}

// `icon` replaces the magnifier; with `onIconClick` it becomes a button
// (e.g. a send arrow) labelled `iconLabel`
function SearchField({
  value, onChange, onKeyDown, onClear, onFocus, onBlur, label, className = '', inputProps,
  icon = <MagnifierIcon />, onIconClick, iconLabel,
}) {
  const inputRef = useRef(null);
  const caretRef = useRef(null);

  const updateCaret = useCallback(() => {
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || !caret) return;
    caret.hidden = document.activeElement !== input || input.selectionStart !== input.selectionEnd;
    if (caret.hidden) return;
    const style = getComputedStyle(input);
    caretMeasureCtx ??= document.createElement('canvas').getContext('2d');
    caretMeasureCtx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const textWidth = caretMeasureCtx.measureText(input.value.slice(0, input.selectionStart)).width;
    const gap = input.value && input.selectionStart === input.value.length ? CARET_END_GAP : 0;
    caret.style.left = `${parseFloat(style.paddingLeft) + textWidth + gap - input.scrollLeft}px`;
    // Restart the blink so the caret stays solid while typing or moving
    caret.style.animation = 'none';
    void caret.offsetWidth;
    caret.style.animation = '';
  }, []);

  // Arrow keys, clicks and drags move the caret without changing the value
  useEffect(() => {
    document.addEventListener('selectionchange', updateCaret);
    return () => document.removeEventListener('selectionchange', updateCaret);
  }, [updateCaret]);

  useLayoutEffect(updateCaret, [value, updateCaret]);

  return (
    <div className={`search-field ${className}`}>
      {onIconClick ? (
        <button
          type="button"
          className="search-field-icon is-button"
          aria-label={iconLabel}
          // Keep focus in the field, like the clear button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onIconClick}
        >
          {icon}
        </button>
      ) : (
        <span className="search-field-icon" aria-hidden="true">{icon}</span>
      )}
      <input
        ref={inputRef}
        type="search"
        className="search-field-input"
        aria-label={label}
        {...inputProps}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={updateCaret}
        onMouseUp={updateCaret}
        onFocus={(e) => {
          updateCaret();
          onFocus?.(e);
        }}
        onBlur={(e) => {
          updateCaret();
          onBlur?.(e);
        }}
        onScroll={updateCaret}
      />
      <span ref={caretRef} className="search-field-caret" aria-hidden="true" hidden />
      {value && (
        <button
          type="button"
          className="search-field-clear"
          aria-label="Clear search"
          // Keep focus in the field so typing can carry on
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 3 L9 9 M9 3 L3 9" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchField;
