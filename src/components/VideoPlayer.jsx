import { useState, useRef, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './VideoPlayer.css';

function VideoPlayer({ src, autoplay = false, className = '' }) {
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverPos, setHoverPos] = useState(0);
  const hideTimerRef = useRef(null);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85);
  const wasPlayingBeforeScrub = useRef(false);

  // Fake progress animation until real load completes
  useEffect(() => {
    if (isLoading && loadProgress < targetFakeProgress.current) {
      fakeProgressRef.current = setInterval(() => {
        setLoadProgress(prev => {
          const increment = Math.random() * 3 + 0.5;
          const next = prev + increment;
          if (next >= targetFakeProgress.current) {
            clearInterval(fakeProgressRef.current);
            return targetFakeProgress.current;
          }
          return next;
        });
      }, 100);
    }
    return () => {
      if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    };
  }, [isLoading]);

  // Handle buffered progress
  const handleProgress = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      if (video.duration > 0) {
        setBuffered(bufferedEnd / video.duration);
        const realProgress = (bufferedEnd / video.duration) * 100;
        if (realProgress > loadProgress) {
          setLoadProgress(realProgress);
        }
      }
    }
  };

  // Autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (video && autoplay) {
      const handleCanPlay = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      };
      if (video.readyState >= 2) {
        handleCanPlay();
      } else {
        video.addEventListener('loadeddata', handleCanPlay, { once: true });
      }
      return () => video.removeEventListener('loadeddata', handleCanPlay);
    }
  }, [autoplay, src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause(); else v.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isScrubbing) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleCanPlay = () => {
    setLoadProgress(100);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    setIsLoading(false);
  };

  const formatTime = (time) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Scrubbing (click + drag on timeline) ---
  const getTimeFromEvent = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  const startScrub = useCallback((e) => {
    e.preventDefault();
    setIsScrubbing(true);
    wasPlayingBeforeScrub.current = isPlaying;
    if (videoRef.current && isPlaying) videoRef.current.pause();
    const t = getTimeFromEvent(e);
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, [isPlaying, getTimeFromEvent]);

  const onScrubMove = useCallback((e) => {
    if (!isScrubbing) return;
    const t = getTimeFromEvent(e);
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, [isScrubbing, getTimeFromEvent]);

  const endScrub = useCallback(() => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    if (wasPlayingBeforeScrub.current && videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isScrubbing]);

  // Global mouse/touch listeners while scrubbing
  useEffect(() => {
    if (!isScrubbing) return;
    const move = (e) => onScrubMove(e);
    const up = () => endScrub();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [isScrubbing, onScrubMove, endScrub]);

  // --- Show / hide controls with idle timer ---
  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (!isScrubbing) setShowControls(false);
    }, 2500);
  }, [isScrubbing]);

  const handleMouseEnter = () => { setShowControls(true); clearTimeout(hideTimerRef.current); };
  const handleMouseLeave = () => {
    if (!isScrubbing) hideTimerRef.current = setTimeout(() => setShowControls(false), 800);
  };
  const handleMouseMoveOnPlayer = () => showControlsBriefly();

  // Timeline hover
  const handleTimelineHover = (e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) setHoverPos((e.clientX - rect.left) / rect.width);
  };

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className={`video-player ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMoveOnPlayer}
    >
      {isLoading && (
        <div className="video-player-loading">
          <LoadingSpinner size={40} />
          <span className="loading-percent">{Math.floor(loadProgress)}%</span>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onProgress={handleProgress}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        onClick={togglePlay}
      />

      {/* Controls overlay */}
      <div className={`video-controls ${showControls || isScrubbing ? 'visible' : ''}`}>
        {/* Timeline / scrubber */}
        <div
          ref={timelineRef}
          className={`timeline-container ${isScrubbing || isHoveringTimeline ? 'active' : ''}`}
          onMouseDown={startScrub}
          onTouchStart={startScrub}
          onMouseEnter={() => setIsHoveringTimeline(true)}
          onMouseLeave={() => setIsHoveringTimeline(false)}
          onMouseMove={handleTimelineHover}
        >
          <div className="timeline-track">
            <div className="timeline-buffered" style={{ width: `${buffered * 100}%` }} />
            <div className="timeline-progress" style={{ width: `${progress * 100}%` }}>
              <div className="timeline-thumb" />
            </div>
            {isHoveringTimeline && !isScrubbing && (
              <div className="timeline-hover-dot" style={{ left: `${hoverPos * 100}%` }} />
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="controls-row">
          <button className="control-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <span className="time-display">
            {formatTime(currentTime)}<span className="time-sep"> / </span>{formatTime(duration)}
          </span>

          <div className="controls-right">
            <button className="control-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
