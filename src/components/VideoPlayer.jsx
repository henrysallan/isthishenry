import { useState, useRef, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './VideoPlayer.css';

function VideoPlayer({ src, autoplay = false, className = '' }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay to work
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85); // Random 85-100

  // Fake progress animation until real load completes
  useEffect(() => {
    if (isLoading && loadProgress < targetFakeProgress.current) {
      fakeProgressRef.current = setInterval(() => {
        setLoadProgress(prev => {
          const increment = Math.random() * 3 + 0.5; // Random increment 0.5-3.5
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

  // Handle actual video progress events
  const handleProgress = () => {
    const video = videoRef.current;
    if (video && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        const realProgress = (bufferedEnd / duration) * 100;
        // Only update if real progress is higher than fake
        if (realProgress > loadProgress) {
          setLoadProgress(realProgress);
        }
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video && autoplay) {
      // Try to play as soon as we have enough data
      const handleCanPlay = () => {
        const playPromise = video.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.log('Autoplay prevented:', err);
              setIsPlaying(false);
            });
        }
      };

      // Use loadeddata instead of canplay for faster start
      if (video.readyState >= 2) {
        // Video has loaded enough to start playing
        handleCanPlay();
      } else {
        // Wait for enough data to be loaded
        video.addEventListener('loadeddata', handleCanPlay, { once: true });
      }

      return () => {
        video.removeEventListener('loadeddata', handleCanPlay);
      };
    }
  }, [autoplay, src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleCanPlay = () => {
    setLoadProgress(100);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    setIsLoading(false);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current) {
      videoRef.current.currentTime = pos * duration;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`video-player ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
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
      />
      
      <div className={`video-controls ${showControls ? 'visible' : ''}`}>
        <div className="timeline-container" onClick={handleSeek}>
          <div className="timeline">
            <div 
              className="timeline-progress" 
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="controls-row">
          <button className="control-btn" onClick={togglePlay}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          
          <span className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          <button className="control-btn" onClick={toggleMute}>
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
