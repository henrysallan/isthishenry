import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { colorThemes } from '../config/theme';
import Hls from 'hls.js';
import './Lightbox.css';

function LightboxVideo({ src }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isHLS = src && src.includes('.m3u8');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          hls.destroy();
          hlsRef.current = null;
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.load();
            video.play().catch(() => {});
          }
        }
      });
    } else {
      video.src = src;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
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
  const currentTheme = useNavigationStore(state => state.currentTheme);
  const isThemeInverted = useNavigationStore(state => state.isThemeInverted);
  const activeColors = colorThemes[currentTheme];
  const strokeColor = '#ffffff';

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

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      {/* Close / return arrow — upper left */}
      <button className="lightbox-back" onClick={onClose} aria-label="Close lightbox">
        <svg width="16" height="16" viewBox="0 0 30 30">
          <path
            d="M 22 22 L 6 6"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 6 14 L 6 6 L 14 6"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>

      {/* Counter */}
      <div className="lightbox-counter">
        {activeIndex + 1} / {items.length}
      </div>

      {/* Prev arrow */}
      {hasPrev && (
        <button className="lightbox-arrow lightbox-arrow-left" onClick={goPrev} aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 30 30">
            <path
              d="M 20 6 L 10 15 L 20 24"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
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
        <button className="lightbox-arrow lightbox-arrow-right" onClick={goNext} aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 30 30">
            <path
              d="M 10 6 L 20 15 L 10 24"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default Lightbox;
