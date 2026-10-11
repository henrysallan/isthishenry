import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { loadHls } from '../utils/loadHls';
import './Lightbox.css';

function LightboxVideo({ src }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isHLS = src && src.includes('.m3u8');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const playNatively = () => {
      video.src = src;
      video.load();
      video.play().catch(() => {});
    };

    if (isHLS) {
      loadHls().then((Hls) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          playNatively();
          return;
        }
        const hls = new Hls();
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            hls.destroy();
            hlsRef.current = null;
            if (video.canPlayType('application/vnd.apple.mpegurl')) playNatively();
          }
        });
      }).catch(() => {
        if (!cancelled && video.canPlayType('application/vnd.apple.mpegurl')) playNatively();
      });
    } else {
      playNatively();
    }

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
    };
  }, [src, isHLS]);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      controls
      className="lightbox-media lightbox-video"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function Lightbox({ items, activeIndex, onClose, onNavigate }) {
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < items.length - 1;
  const current = items[activeIndex];

  const goPrev = useCallback((e) => {
    e?.stopPropagation();
    if (hasPrev) onNavigate(activeIndex - 1);
  }, [hasPrev, activeIndex, onNavigate]);

  const goNext = useCallback((e) => {
    e?.stopPropagation();
    if (hasNext) onNavigate(activeIndex + 1);
  }, [hasNext, activeIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!current) return null;

  const isVideo = current.type === 'video' || /\.(mp4|mov|webm|m3u8)/i.test(current.src);

  // Rendered on <body>: inside the content area its z-index would only count
  // within that panel, leaving the nav box drawn over it
  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      {/* Close / return arrow — upper left */}
      <button className="icon-button lightbox-back" onClick={onClose} aria-label="Close lightbox">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M10 10 L2 2 M2 7.5 L2 2 L7.5 2" />
        </svg>
      </button>

      {/* Counter */}
      <div className="lightbox-counter">
        {activeIndex + 1} / {items.length}
      </div>

      {/* Prev arrow */}
      {hasPrev && (
        <button className="icon-button lightbox-arrow lightbox-arrow-left" onClick={goPrev} aria-label="Previous">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M7.5 2 L3.5 6 L7.5 10" />
          </svg>
        </button>
      )}

      {/* Media */}
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <LightboxVideo key={current.src} src={current.src} />
        ) : (
          <img
            className="lightbox-media lightbox-image"
            src={current.src}
            alt={current.alt || ''}
          />
        )}
      </div>

      {/* Next arrow */}
      {hasNext && (
        <button className="icon-button lightbox-arrow lightbox-arrow-right" onClick={goNext} aria-label="Next">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M4.5 2 L8.5 6 L4.5 10" />
          </svg>
        </button>
      )}
    </div>,
    document.body
  );
}

export default Lightbox;
