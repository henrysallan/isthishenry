import { useEffect } from 'react';
import { loadHls } from './loadHls';

export const isHls = (src) => typeof src === 'string' && src.includes('.m3u8');

// Mux serves a thumbnail for every stream, so FrameRate videos get posters for free:
// stream.mux.com/{id}.m3u8 → image.mux.com/{id}/thumbnail.webp
export function muxPoster(src) {
  const id = typeof src === 'string' && src.match(/^https:\/\/stream\.mux\.com\/([^/.?]+)\.m3u8/)?.[1];
  return id ? `https://image.mux.com/${id}/thumbnail.webp` : undefined;
}

// Points videoRef's <video> at src. HLS streams go through hls.js, capped to the
// player's size so small thumbnails don't pull full-resolution renditions.
// Native HLS is only the fallback where hls.js can't run (older iOS): Chromium
// reports canPlayType "maybe" for HLS and then fails to play these streams.
export function useVideoSource(videoRef, src) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (!isHls(src)) {
      video.src = src;
      return;
    }

    let hls = null;
    let cancelled = false;
    const playNatively = () => {
      if (!cancelled) video.src = src;
    };
    loadHls().then((Hls) => {
      if (cancelled) return;
      if (!Hls.isSupported()) return playNatively();
      hls = new Hls({ capLevelToPlayerSize: true });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (video.autoplay) video.play().catch(() => {});
      });
    }).catch(playNatively);

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [videoRef, src]);
}
