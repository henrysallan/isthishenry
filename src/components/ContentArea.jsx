import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { theme } from '../config/theme';
import { R2Video, getR2VideoUrl } from '../utils/videoStreaming';
import VideoPlayer from './VideoPlayer';
import LoadingSpinner from './LoadingSpinner';
import gsap from 'gsap';
import Hls from 'hls.js';
import CyclingText from './CyclingText';
import Lightbox from './Lightbox';
import './ContentArea.css';

// Collect all video URLs from navigation data for the about page showcase
function collectAllVideoUrls() {
  const urls = [];
  const walk = (items) => {
    if (!items) return;
    for (const item of items) {
      const content = item.content;
      if (content?.blocks) {
        const baseUrl = content.baseUrl || '';
        for (const block of content.blocks) {
          if (block.type === 'video') {
            const src = block.src.startsWith('http') ? block.src : `${baseUrl}${block.src}`;
            urls.push(src);
          }
        }
      }
      if (item.submenu) walk(item.submenu);
    }
  };
  walk(navigationData.mainMenu);
  return urls;
}

const ALL_VIDEO_URLS = collectAllVideoUrls();

// Shuffles array in place (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CYCLE_INTERVAL = 6000; // ms between video swaps

// A single about-page media slot that cycles through random project videos
function AboutMediaSlot({ slotIndex }) {
  const [shuffled] = useState(() => {
    const s = shuffle(ALL_VIDEO_URLS);
    if (slotIndex === 1) {
      const half = Math.floor(s.length / 2);
      return [...s.slice(half), ...s.slice(0, half)];
    }
    return s;
  });
  const indexRef = useRef(0);
  // Double-buffer: two video elements, swap which is on top
  const [active, setActive] = useState(0); // 0 or 1
  const [srcs, setSrcs] = useState([shuffled[0] || '', '']);
  const videoRefs = [useRef(null), useRef(null)];
  const timerRef = useRef(null);

  const nextIndex = () => {
    indexRef.current = (indexRef.current + 1) % shuffled.length;
    return indexRef.current;
  };

  // Preload next video into the back buffer, swap when ready
  const queueNext = useCallback(() => {
    const next = nextIndex();
    const backIdx = active === 0 ? 1 : 0;
    setSrcs(prev => {
      const copy = [...prev];
      copy[backIdx] = shuffled[next];
      return copy;
    });

    const backVideo = videoRefs[backIdx].current;
    if (backVideo) {
      backVideo.load();

      const onReady = () => {
        backVideo.removeEventListener('canplaythrough', onReady);
        backVideo.play().catch(() => {});
        setActive(backIdx);
      };
      backVideo.addEventListener('canplaythrough', onReady);
    }
  }, [active, shuffled]);

  // Cycle on interval
  useEffect(() => {
    if (shuffled.length <= 1) return;
    timerRef.current = setInterval(queueNext, CYCLE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [queueNext, shuffled]);

  // Play the initial video
  useEffect(() => {
    const v = videoRefs[0].current;
    if (v) v.play().catch(() => {});
  }, []);

  return (
    <div className="about-media-item loaded">
      <video
        ref={videoRefs[0]}
        src={srcs[0]}
        muted
        loop
        playsInline
        autoPlay
        className={`about-video-layer ${active === 0 ? 'front' : 'back'}`}
      />
      <video
        ref={videoRefs[1]}
        src={srcs[1]}
        muted
        loop
        playsInline
        className={`about-video-layer ${active === 1 ? 'front' : 'back'}`}
      />
    </div>
  );
}

// Progressive image loading component - shows blur placeholder until loaded
// Includes retry logic for failed/stalled Cloudflare R2 requests
function ProgressiveImage({ src, alt, className, onClick }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const retriesRef = useRef(0);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85);
  const maxRetries = 3;

  // Fake progress animation
  useEffect(() => {
    if (!isLoaded && !hasError && loadProgress < targetFakeProgress.current) {
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
  }, [isLoaded, hasError]);

  useEffect(() => {
    setIsLoaded(false);
    setCurrentSrc(null);
    setHasError(false);
    setLoadProgress(0);
    retriesRef.current = 0;
    targetFakeProgress.current = Math.floor(Math.random() * 16) + 85;
    
    let isMounted = true;
    let timeoutId = null;
    
    const attemptLoad = () => {
      const img = new Image();
      
      // Set a timeout for stalled requests
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        retriesRef.current++;
        if (retriesRef.current < maxRetries) {
          console.log(`[ProgressiveImage] Timeout, retrying (${retriesRef.current}/${maxRetries}): ${src}`);
          attemptLoad();
        } else {
          setHasError(true);
        }
      }, 8000); // 8 second timeout per attempt
      
      img.onload = () => {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoadProgress(100);
          if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
          setCurrentSrc(src);
          setIsLoaded(true);
        }
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        if (!isMounted) return;
        retriesRef.current++;
        if (retriesRef.current < maxRetries) {
          console.log(`[ProgressiveImage] Error, retrying (${retriesRef.current}/${maxRetries}): ${src}`);
          // Add small delay before retry with cache-busting
          setTimeout(attemptLoad, 500 * retriesRef.current);
        } else {
          setHasError(true);
        }
      };
      
      // Add cache-busting for retries to avoid cached failures
      const finalUrl = retriesRef.current > 0 
        ? `${src}${src.includes('?') ? '&' : '?'}_retry=${retriesRef.current}` 
        : src;
      img.src = finalUrl;
    };
    
    attemptLoad();
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [src]);

  // Manual retry handler for user interaction
  const handleRetry = (e) => {
    e.stopPropagation();
    retriesRef.current = 0;
    setHasError(false);
    setIsLoaded(false);
    setCurrentSrc(null);
    // Force re-run effect by updating a dependency - we'll do it via state
  };

  return (
    <div className={`progressive-image-wrapper ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`} onClick={hasError ? handleRetry : onClick}>
      {hasError ? (
        <div className="image-error-placeholder">
          <span>⟳</span>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="image-placeholder">
              <span className="loading-number">{Math.floor(loadProgress)}</span>
            </div>
          )}
          <img 
            src={currentSrc || undefined}
            alt={alt}
            className={className}
            style={!isLoaded ? { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' } : undefined}
          />
        </>
      )}
    </div>
  );
}

// Grid image component with loading state
function GridImage({ src, alt }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85);

  useEffect(() => {
    if (!isLoaded && loadProgress < targetFakeProgress.current) {
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
  }, [isLoaded]);

  const handleLoad = () => {
    setLoadProgress(100);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    setIsLoaded(true);
  };

  return (
    <div className="grid-media-wrapper">
      {!isLoaded && (
        <div className="grid-loading-placeholder">
          <span className="loading-number">{Math.floor(loadProgress)}</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
    </div>
  );
}

// Grid video component with loading state
function GridVideo({ src }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85);

  useEffect(() => {
    if (!isLoaded && loadProgress < targetFakeProgress.current) {
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
  }, [isLoaded]);

  const handleLoad = () => {
    setLoadProgress(100);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    setIsLoaded(true);
  };

  return (
    <div className="grid-media-wrapper">
      {!isLoaded && (
        <div className="grid-loading-placeholder">
          <span className="loading-number">{Math.floor(loadProgress)}</span>
        </div>
      )}
      <video
        src={src}
        muted
        loop
        playsInline
        autoPlay
        onLoadedData={handleLoad}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />
    </div>
  );
}

// Lazy loading video component - only plays when in viewport
// Includes retry logic for failed Cloudflare R2 requests
function LazyVideo({ src, poster, aspectRatio }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [useVimeoFallback, setUseVimeoFallback] = useState(false);
  const fakeProgressRef = useRef(null);
  const targetFakeProgress = useRef(Math.floor(Math.random() * 16) + 85);
  const maxRetries = 3;
  const isHLS = src && src.includes('.m3u8');
  const isVimeoHLS = isHLS && /player\.vimeo\.com\/external\//.test(src);

  // Fake progress animation
  useEffect(() => {
    if (!isLoaded && !hasError && loadProgress < targetFakeProgress.current) {
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
  }, [isLoaded, hasError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up HLS if needed
    if (isHLS && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(src);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Auto-play once manifest is ready if already in view
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          // On fatal error (e.g. CORS), destroy hls.js and try native playback
          hls.destroy();
          hlsRef.current = null;
          if (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL')) {
            video.src = src;
            video.load();
            video.play().catch(() => {});
          } else if (isVimeoHLS) {
            // Fall back to Vimeo iframe embed (bypasses CORS)
            setUseVimeoFallback(true);
          } else {
            handleError();
          }
        }
      });
    } else if (isHLS) {
      // Native HLS (Safari / browsers with native support)
      video.src = src;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Handle video load errors with retry
  const handleError = () => {
    if (retryCount < maxRetries) {
      console.log(`[LazyVideo] Error, retrying (${retryCount + 1}/${maxRetries}): ${src}`);
      setRetryCount(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setRetryCount(0);
    setIsLoaded(false);
  };

  const handleLoadedData = () => {
    setLoadProgress(100);
    if (fakeProgressRef.current) clearInterval(fakeProgressRef.current);
    setIsLoaded(true);
  };

  // Generate src with cache-busting for retries
  const videoSrc = retryCount > 0 
    ? `${src}${src.includes('?') ? '&' : '?'}_retry=${retryCount}` 
    : src;

  // Vimeo iframe fallback when hls.js fails (e.g. CORS on Edge)
  if (useVimeoFallback) {
    return <VimeoEmbed src={src} aspectRatio={aspectRatio} />;
  }

  if (hasError) {
    return (
      <div className="video-error-placeholder" onClick={handleRetry}>
        <span>⟳</span>
      </div>
    );
  }

  return (
    <div className={`lazy-video-wrapper ${isLoaded ? 'loaded' : 'loading'}`} style={aspectRatio ? { aspectRatio, overflow: 'hidden' } : undefined}>
      {!isLoaded && (
        <div className="video-loading-placeholder">
          <span className="loading-number">{Math.floor(loadProgress)}</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={isHLS ? undefined : videoSrc}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        onError={isHLS ? undefined : handleError}
        onLoadedData={handleLoadedData}
      />
    </div>
  );
}

// Vimeo embed component - no controls, autoplay, loop
function VimeoEmbed({ src, aspectRatio = '56.25%' }) {
  // Extract video ID from various Vimeo URL formats
  // Supports: vimeo.com/{id}, player.vimeo.com/video/{id}, player.vimeo.com/external/{id}.m3u8
  const getVimeoId = (url) => {
    const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/(?:video|external)\/)(\d+)/);
    return match ? match[1] : url;
  };
  const videoId = getVimeoId(src);
  const embedUrl = `https://player.vimeo.com/video/${videoId}?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1`;

  return (
    <div className="vimeo-embed" style={{ paddingBottom: aspectRatio }}>
      <iframe
        src={embedUrl}
        frameBorder="0"
        allow="autoplay; fullscreen"
        allowFullScreen
        title="Vimeo video"
      />
    </div>
  );
}

// ── Work list with native scrolling ──
function WorkList({ items, onItemClick }) {
  return (
    <div className="work-list-container">
      <div className="work-list">
        {items.map((item) => {
          const thumbnailSrc = item.content?.thumbnail;
          const isVideo = thumbnailSrc && (thumbnailSrc.endsWith('.mp4') || thumbnailSrc.endsWith('.mov') || thumbnailSrc.endsWith('.webm'));
          return (
            <div
              key={item.id}
              className="work-row"
              onClick={() => onItemClick(item.id)}
            >
              <div className="work-row-text">
                <span className="work-row-title">{item.title}</span>
                <span className="work-row-tags">{item.content?.tags || ''}</span>
              </div>
              <div className="work-row-thumb">
                {thumbnailSrc && (
                  isVideo ? (
                    <video src={thumbnailSrc} muted loop playsInline autoPlay />
                  ) : (
                    <img src={thumbnailSrc} alt={item.title} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContentArea() {
  const { currentView, navigateToSubpage, navigateToNestedSubmenu } = useNavigationStore();
  const [content, setContent] = useState(null);
  const [parentSubmenu, setParentSubmenu] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lightboxItems, setLightboxItems] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const contentAreaRef = useRef(null);
  const contentInnerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const previousViewRef = useRef(currentView);
  const previousContentRef = useRef(null);

  useEffect(() => {
    const findContent = (items, parent = null) => {
      for (const item of items) {
        if (item.id === currentView) {
          return { content: item.content, submenu: item.submenu, parentId: parent?.id || item.id };
        }
        if (item.submenu) {
          const found = findContent(item.submenu, item);
          if (found) return found;
        }
      }
      return null;
    };

    let newContent = null;
    let submenuItems = null;
    let parentId = null;
    
    if (currentView === 'home') {
      newContent = navigationData.home.content;
    } else if (currentView) {
      const result = findContent(navigationData.mainMenu);
      if (result) {
        newContent = result.content;
        submenuItems = result.submenu;
        parentId = result.parentId;
      }
    }

    // If we're changing views, animate the transition
    if (previousViewRef.current !== currentView && content && contentInnerRef.current) {
      setIsTransitioning(true);
      
      // Reset scroll position on the scrollable container
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      
      // Pause all videos
      const allVideos = contentInnerRef.current.querySelectorAll('video');
      allVideos.forEach(video => video.pause());
      
      // Hard cut — swap content immediately
      previousContentRef.current = content;
      setContent(newContent);
      setParentSubmenu(submenuItems ? { items: submenuItems, parentId } : null);
      setIsTransitioning(false);
    } else {
      setContent(newContent);
      setParentSubmenu(submenuItems ? { items: submenuItems, parentId } : null);
    }

    previousViewRef.current = currentView;
  }, [currentView, content]);

  const handleGridItemClick = (itemId, parentId, parentView = null) => {
    navigateToSubpage(itemId, parentId, parentView);
  };

  const getVideoSrc = (item) => {
    if (item.content?.videoUrl) return item.content.videoUrl;
    if (item.content?.videoKey) return getR2VideoUrl(item.content.videoKey);
    return null;
  };

  const renderContent = (contentData, view) => {
    if (!contentData) return null;
    
    // Home view
    if (view === 'home') {
      return (
        <div className="home-content">
          <div className="video-container full-bleed">
            <VideoPlayer 
              src="https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4"
              autoplay={true}
            />
          </div>
        </div>
      );
    }
    
    // Projects page – 2-per-row card grid
    if (contentData.isProjectsPage && contentData.projects) {
      return (
        <div className="projects-page">
          <div className="page-header">
            <h1>{contentData.title}</h1>
          </div>
          <div className="projects-grid">
            {contentData.projects.map((project, index) => (
              <div key={index} className="project-card">
                <div className="project-card-text">
                  <span className="project-card-title">{project.title}</span>
                  <span className="project-card-desc">{project.description}</span>
                </div>
                <div className="project-card-image">
                  <ProgressiveImage src={project.image} alt={project.title} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Row-based work list for submenu landing pages
    if (contentData.isGrid && parentSubmenu?.items) {
      const listItems = parentSubmenu.items;
      // If viewing a nested grid (e.g. More inside Work), pass current view as parentView
      // so go-back navigates through the intermediate page
      const nestedParentView = view !== parentSubmenu.parentId ? view : null;
      return (
        <WorkList 
          items={listItems} 
          onItemClick={(itemId) => {
            const clickedItem = listItems.find(item => item.id === itemId);
            if (clickedItem?.type === 'submenu') {
              // Open nested submenu (e.g. "More" inside Work)
              navigateToNestedSubmenu(itemId);
            } else {
              handleGridItemClick(itemId, parentSubmenu.parentId, nestedParentView);
            }
          }} 
        />
      );
    }
    
    // About page – custom layout
    if (contentData.isAboutPage) {
      return (
        <div className="about-page">
          <div className="about-copy">
            <h1 className="about-headline">{contentData.headline}</h1>
            {contentData.statements?.map((s, i) => (
              <CyclingText
                key={i}
                prefix={s.prefix}
                suffixes={s.suffixes}
                className="about-statement"
                interval={i === 0 ? 4000 : 5500}
              />
            ))}
          </div>

          <div className="about-media">
            <AboutMediaSlot slotIndex={0} />
            <AboutMediaSlot slotIndex={1} />
          </div>

          <div className="about-footer">
            <div className="about-skills">
              {contentData.skills?.map((s, i) => (
                <span key={i} className="about-skill">{s}</span>
              ))}
            </div>
            <div className="about-info">
              <div className="about-info-links">
                {contentData.links?.map((link, i) => (
                  <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className={`about-link ${link.underline ? 'underline' : ''}`}>{link.label}</a>
                ))}
              </div>
              <div className="about-info-bottom">
                {contentData.location && <span className="about-location">{contentData.location}</span>}
                {contentData.cta && (
                  <a href={contentData.cta.href} target="_blank" rel="noopener noreferrer" className={`about-link ${contentData.cta.underline ? 'underline' : ''}`}>{contentData.cta.label}</a>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if this is a text-only page (no media)
    const isTextOnly = !contentData.videoUrl && !contentData.videoKey && 
                       !contentData.imageGallery && !contentData.videoGallery && 
                       !contentData.mediaGallery && !contentData.sections &&
                       !contentData.contactLinks && !contentData.blocks;
    
    // Regular page view
    const hasCaseStudyHeader = contentData.year || contentData.tags;
    return (
      <div className={`page-content ${isTextOnly ? 'text-only' : ''}`}>
        {hasCaseStudyHeader ? (
          <div className="case-study-header">
            <div className="case-study-header-row">
              <div className="case-study-left">
                <h1 className="case-study-title">{contentData.title}</h1>
                {contentData.description && <p className="case-study-description">{contentData.description}</p>}
              </div>
              <div className="case-study-right">
                {contentData.year && <span className="case-study-year">{contentData.year}</span>}
                {contentData.tags && <span className="case-study-tags">{contentData.tags}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="page-header">
            <h1>{contentData.title}</h1>
            {contentData.description && <p className="description">{contentData.description}</p>}
          </div>
        )}
        {contentData.contactLinks && (
          <div className="contact-links">
            {contentData.contactLinks.map((link, index) => (
              <p key={index} className="contact-link-item">
                {link.label}: <a href={link.href} target="_blank" rel="noopener noreferrer">{link.value}</a>
              </p>
            ))}
          </div>
        )}
        {contentData.blocks && (() => {
          // Build flat media list for lightbox navigation
          const mediaItems = contentData.blocks
            .map((block) => {
              const fullSrc = block.src.startsWith('http') ? block.src : `${contentData.baseUrl || ''}${block.src}`;
              const isVideo = block.type === 'video' || /\.(mp4|mov|webm)$/i.test(fullSrc);
              const isVimeo = block.type === 'vimeo';
              if (isVimeo) return null; // skip vimeo embeds from lightbox
              return { src: fullSrc, type: isVideo ? 'video' : 'image', alt: `${contentData.title}` };
            })
            .filter(Boolean);

          const openLightbox = (fullSrc) => {
            const idx = mediaItems.findIndex(m => m.src === fullSrc);
            setLightboxItems(mediaItems);
            setLightboxIndex(idx >= 0 ? idx : 0);
          };

          return (
            <div className="blocks-grid">
              {contentData.blocks.map((block, index) => {
                const fullSrc = block.src.startsWith('http') ? block.src : `${contentData.baseUrl || ''}${block.src}`;
                const isVideo = block.type === 'video' || /\.(mp4|mov|webm)$/i.test(fullSrc);
                const isVimeo = block.type === 'vimeo';
                return (
                  <div
                    key={index}
                    className={`block-item ${!isVimeo ? 'clickable' : ''}`}
                    style={{ gridColumn: `${block.colStart} / span ${block.colSpan}` }}
                    onClick={!isVimeo ? () => openLightbox(fullSrc) : undefined}
                  >
                    {isVimeo ? (
                      <VimeoEmbed src={block.src} aspectRatio={block.aspectRatio} />
                    ) : isVideo ? (
                      <LazyVideo src={fullSrc} aspectRatio={block.aspectRatio} />
                    ) : (
                      <ProgressiveImage
                        src={fullSrc}
                        alt={`${contentData.title} - ${index + 1}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        {contentData.videoUrl && (
          <div className="video-container">
            <VideoPlayer 
              src={contentData.videoUrl}
              autoplay={true}
            />
          </div>
        )}
        {contentData.videoKey && (
          <div className="video-container">
            <R2Video videoKey={contentData.videoKey} />
          </div>
        )}
        {contentData.imageGallery && (
          <div className="image-gallery" style={{ columns: contentData.imageGallery.columns || 2 }}>
            {contentData.imageGallery.images.map((image, index) => (
              <div 
                key={index} 
                className={`gallery-image-row ${contentData.imageGallery.clickToExpand ? 'clickable' : ''}`}
              >
                <ProgressiveImage 
                  src={`${contentData.imageGallery.baseUrl}${image}`}
                  alt={`${contentData.title} - ${index + 1}`}
                  onClick={() => {
                    if (contentData.imageGallery.clickToExpand) {
                      const items = contentData.imageGallery.images.map((img, idx) => ({
                        src: `${contentData.imageGallery.baseUrl}${img}`,
                        type: 'image',
                        alt: `${contentData.title} - ${idx + 1}`
                      }));
                      setLightboxItems(items);
                      setLightboxIndex(index);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {contentData.videoGallery && (
          <div className="video-gallery" style={{ columns: contentData.videoGallery.columns || 2 }}>
            {contentData.videoGallery.videos.map((videoUrl, index) => (
              <div key={index} className="gallery-video-item">
                <LazyVideo src={videoUrl} />
              </div>
            ))}
          </div>
        )}
        {contentData.mediaGallery && (
          <div className="media-gallery" style={{ columns: contentData.mediaGallery.columns || 3 }}>
            {contentData.mediaGallery.items.map((item, index) => {
              const isVideo = item.endsWith('.mp4') || item.endsWith('.mov') || item.endsWith('.webm');
              const src = `${contentData.mediaGallery.baseUrl}${item}`;
              return (
                <div key={index} className="gallery-media-item">
                  {isVideo ? (
                    <LazyVideo src={src} />
                  ) : (
                    <ProgressiveImage 
                      src={src}
                      alt={`${contentData.title} - ${index + 1}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Sections support for projects page */}
        {contentData.sections && contentData.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="content-section">
            <div className="section-header">
              {section.titleLink ? (
                <a href={section.titleLink} target="_blank" rel="noopener noreferrer" className="section-title-link">
                  <h2>{section.title}</h2>
                </a>
              ) : (
                <h2>{section.title}</h2>
              )}
              {section.description && <p className="section-description">{section.description}</p>}
            </div>
            {section.imageGallery && (
              <div className="image-gallery" style={{ columns: section.imageGallery.columns || 2 }}>
                {section.imageGallery.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`gallery-image-row ${section.imageGallery.clickToExpand ? 'clickable' : ''}`}
                  >
                    <ProgressiveImage 
                      src={`${section.imageGallery.baseUrl}${image}`}
                      alt={`${section.title} - ${index + 1}`}
                      onClick={() => {
                        if (section.imageGallery.clickToExpand) {
                          const items = section.imageGallery.images.map((img, idx) => ({
                            src: `${section.imageGallery.baseUrl}${img}`,
                            type: 'image',
                            alt: `${section.title} - ${idx + 1}`
                          }));
                          setLightboxItems(items);
                          setLightboxIndex(index);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {section.videoGallery && (
              <div className="video-gallery" style={{ columns: section.videoGallery.columns || 2 }}>
                {section.videoGallery.videos.map((videoUrl, index) => (
                  <div key={index} className="gallery-video-item">
                    <LazyVideo src={videoUrl} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="content-area" ref={contentAreaRef}>
      {content && (
        <div className="content-slide-wrapper" ref={contentInnerRef}>
          <div className="content-inner" ref={scrollContainerRef}>
            {renderContent(content, currentView)}
          </div>
        </div>
      )}
      {lightboxItems && (
        <Lightbox
          items={lightboxItems}
          activeIndex={lightboxIndex}
          onClose={() => setLightboxItems(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </div>
  );
}

export default ContentArea;
