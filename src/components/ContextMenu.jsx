import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { navigationData } from '../data/navigation';
import './ContextMenu.css';

const EMAIL = navigationData.home.content.email;
// Keep the menu at least this far from the window edges
const EDGE = 8;
// How long "Copied" shows before the menu closes
const COPIED_MS = 700;

const LINKS = [
  { label: 'Launch Book', href: 'https://book.isthishenry.com' },
  { label: 'Launch Toolbox', href: 'https://toolbox.design' },
];

function GlobeIcon() {
  return (
    <svg className="context-menu-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" />
      <path d="M1.5 7 H12.5 M7 1.5 C4.6 3.5 4.6 10.5 7 12.5 M7 1.5 C9.4 3.5 9.4 10.5 7 12.5" />
    </svg>
  );
}

// The async clipboard API first; the older execCommand route covers browsers
// and embeds that refuse it
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Copy was refused');
  }
}

// Replaces the browser's right-click menu. Text fields keep the browser's menu
// (for paste and spelling), and Shift + right-click shows it anywhere.
function ContextMenu() {
  const [position, setPosition] = useState(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    const onContextMenu = (e) => {
      if (e.shiftKey || e.target.closest?.('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      clearTimeout(closeTimerRef.current);
      setCopied(false);
      setPosition({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Close on a press outside, Escape, scrolling, resizing or leaving the window
  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // Only the menu closes, not a lightbox open underneath it
      e.stopPropagation();
      close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [position]);

  // Open at the pointer, nudged back inside the window near the edges
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!position || !menu) return;
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(EDGE, Math.min(position.x, window.innerWidth - width - EDGE))}px`;
    menu.style.top = `${Math.max(EDGE, Math.min(position.y, window.innerHeight - height - EDGE))}px`;
    // Focus the menu, not an item, so nothing looks selected until hovered
    menu.focus({ preventScroll: true });
  }, [position]);

  const copyEmail = async () => {
    try {
      await copyText(EMAIL);
      setCopied(true);
      closeTimerRef.current = setTimeout(() => setPosition(null), COPIED_MS);
    } catch {
      // Clipboard access was refused; nothing useful to show
      setPosition(null);
    }
  };

  if (!position) return null;

  return (
    <div ref={menuRef} className="context-menu" role="menu" tabIndex={-1}>
      <button type="button" className="context-menu-item" role="menuitem" onClick={copyEmail}>
        {copied ? 'Copied' : 'Copy email'}
      </button>
      <div className="context-menu-divider" role="separator" />
      {LINKS.map(link => (
        <a
          key={link.href}
          className="context-menu-item"
          role="menuitem"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setPosition(null)}
        >
          <GlobeIcon />
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default ContextMenu;
