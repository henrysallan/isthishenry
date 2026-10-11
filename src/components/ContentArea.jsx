import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { R2Video } from '../utils/videoStreaming';
import VideoPlayer from './VideoPlayer';
import LoadingSpinner from './LoadingSpinner';
import { loadHls } from '../utils/loadHls';
import { muxPoster } from '../utils/videoSource';
import CyclingText from './CyclingText';
import Lightbox from './Lightbox';
import StreamVideo from './StreamVideo';
import { columnSizes, responsiveImage } from '../utils/responsiveImage';
import { fuzzySearch } from '../utils/fuzzySearch';
import SearchField from './SearchField';
import { isCaseStudy, linkLabel } from '../utils/caseStudy';
import './ContentArea.css';

// Collect all media URLs from the Sketches section for the about page showcase
function collectSketchesMedia() {
  const media = [];
  const walk = (items) => {
    if (!items) return;
    for (const item of items) {
      if (item.id === 'sketches' && item.content?.blocks) {
        const baseUrl = item.content.baseUrl || '';
        for (const block of item.content.blocks) {
          if (!block.src) continue;
          const src = block.src.startsWith('http') ? block.src : `${baseUrl}${block.src}`;
          const isVideo = block.type === 'video' || /\.(mp4|mov|webm|m3u8)$/i.test(src);
          media.push({ src, type: isVideo ? 'video' : 'image' });
        }
        return;
      }
      if (item.submenu) walk(item.submenu);
    }
  };
  walk(navigationData.mainMenu);
  return media;
}

const SKETCHES_MEDIA = collectSketchesMedia();

// Shuffles array in place (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CYCLE_INTERVAL = 800; // ms between video swaps

// A single about-page media slot that cycles through sketches assets (images + videos)
function AboutMediaSlot() {
  const [shuffled] = useState(() => shuffle(SKETCHES_MEDIA));
  const indexRef = useRef(0);
  const [active, setActive] = useState(0); // 0 or 1
  const [items, setItems] = useState([shuffled[0] || null, null]);
  const videoRefs = [useRef(null), useRef(null)];
  const timerRef = useRef(null);

  const nextIndex = () => {
    indexRef.current = (indexRef.current + 1) % shuffled.length;
    return indexRef.current;
  };

  // Preload next item into the back buffer, swap when ready
  const queueNext = useCallback(() => {
    const next = nextIndex();
    const backIdx = active === 0 ? 1 : 0;
    const nextItem = shuffled[next];
    setItems(prev => {
      const copy = [...prev];
      copy[backIdx] = nextItem;
      return copy;
    });

    if (nextItem.type === 'video') {
      // Wait for video to be ready
      const checkVideo = () => {
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
      };
      // Small delay to let React render the new src
      setTimeout(checkVideo, 50);
    } else {
      // Preload image then swap
      const img = new Image();
      img.onload = () => setActive(backIdx);
      img.src = nextItem.src;
    }
  }, [active, shuffled]);

  // Cycle on interval
  useEffect(() => {
    if (shuffled.length <= 1) return;
    timerRef.current = setInterval(queueNext, CYCLE_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [queueNext, shuffled]);

  // Play the initial video if first item is video
  useEffect(() => {
    if (items[0]?.type === 'video') {
      const v = videoRefs[0].current;
      if (v) v.play().catch(() => {});
    }
  }, []);

  const renderLayer = (idx) => {
    const item = items[idx];
    if (!item) return null;
    const cls = `about-video-layer ${active === idx ? 'front' : 'back'}`;
    if (item.type === 'video') {
      return <StreamVideo ref={videoRefs[idx]} src={item.src} muted loop playsInline autoPlay className={cls} />;
    }
    return <img src={item.src} alt="Sketch" className={cls} />;
  };

  return (
    <div className="about-media-item loaded">
      {renderLayer(0)}
      {renderLayer(1)}
    </div>
  );
}

// Progressive image loading component - shows blur placeholder until loaded
// Includes retry logic for failed/stalled Cloudflare R2 requests
// Published images (scripts/publish-images.mjs) show a tiny blurred preview at
// once, at their real aspect ratio, then load the sharp version, at the width the
// screen needs, as they near the viewport. Other images just load lazily.
function ProgressiveImage({ src, alt, className, onClick, sizes = columnSizes() }) {
  const variant = responsiveImage(src);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const isLoaded = loadedSrc === src;

  if (failedSrc === src) {
    const retry = (e) => {
      e.stopPropagation();
      setFailedSrc(null);
      setAttempt((n) => n + 1);
    };
    return (
      <div className="progressive-image-wrapper error" onClick={retry}>
        <div className="image-error-placeholder">
          <span>⟳</span>
        </div>
      </div>
    );
  }

  // Until it loads, an image without size data holds a 4:3 space.
  const aspectRatio = variant ? `${variant.width} / ${variant.height}` : isLoaded ? undefined : '4 / 3';
  return (
    <div
      className={`progressive-image-wrapper ${isLoaded ? 'loaded' : 'loading'}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      onClick={onClick}
    >
      {variant && <img className="image-blur" src={variant.placeholder} alt="" aria-hidden="true" />}
      <img
        key={attempt}
        src={src}
        srcSet={variant?.srcSet}
        sizes={variant ? sizes : undefined}
        width={variant?.width}
        height={variant?.height}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}

// Lazy loading video component - only plays when in viewport
// Includes retry logic for failed Cloudflare R2 requests
function LazyVideo({ src, poster, aspectRatio }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const inViewRef = useRef(false);
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
    let cancelled = false;

    // When hls.js can't play the stream (e.g. CORS) or fails to load
    const fallBackFromHls = () => {
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
    };

    // Set up HLS if needed
    if (isHLS) {
      loadHls().then((Hls) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          // Native HLS (Safari / browsers with native support)
          video.src = src;
          return;
        }
        const hls = new Hls();
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(src);
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Auto-play once manifest is ready if already in view
          if (inViewRef.current) video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            // On fatal error, destroy hls.js and try native playback
            hls.destroy();
            hlsRef.current = null;
            fallBackFromHls();
          }
        });
      }).catch(() => {
        if (!cancelled) fallBackFromHls();
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          inViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
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
      cancelled = true;
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
        poster={poster ?? muxPoster(src)}
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
// Search also reaches into nested lists (e.g. the projects inside More); those
// results carry the nested list's id so they open with it as their parent view.
function WorkList({ items, onItemClick }) {
  const [query, setQuery] = useState('');
  const searchable = useMemo(() => items.flatMap(item => (
    item.type === 'submenu' && item.submenu
      ? item.submenu.map(child => ({ ...child, parentView: item.id }))
      : [item]
  )), [items]);
  const isSearching = query.trim() !== '';
  const rows = isSearching ? fuzzySearch(searchable, query) : items;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isSearching && rows[0]) onItemClick(rows[0].id, rows[0].parentView);
    if (e.key === 'Escape') setQuery('');
  };

  return (
    <div className="work-list-container">
      <div className="work-list">
        <SearchField
          className="work-search"
          label="Search work"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onClear={() => setQuery('')}
        />
        {isSearching && rows.length === 0 && <p className="work-empty">No matches</p>}
        {rows.map((item) => {
          const thumbnailSrc = item.content?.thumbnail;
          const isVideo = thumbnailSrc && /\.(mp4|mov|webm|m3u8)$/i.test(thumbnailSrc);
          return (
            <div
              key={item.id}
              className="work-row"
              onClick={() => onItemClick(item.id, item.parentView)}
            >
              <div className="work-row-text">
                <span className="work-row-title">{item.title}</span>
                <span className="work-row-tags">{item.content?.tags || ''}</span>
              </div>
              <div className="work-row-thumb">
                {thumbnailSrc && (
                  isVideo ? (
                    <StreamVideo src={thumbnailSrc} muted loop playsInline autoPlay />
                  ) : (
                    <img src={thumbnailSrc} srcSet={responsiveImage(thumbnailSrc)?.srcSet} sizes="88px" alt={item.title} />
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
  // Select fields individually: subscribing to the whole store re-rendered
  // the entire page on every hover-flag write.
  const currentView = useNavigationStore(state => state.currentView);
  const navigateToSubpage = useNavigationStore(state => state.navigateToSubpage);
  const navigateToNestedSubmenu = useNavigationStore(state => state.navigateToNestedSubmenu);
  const [content, setContent] = useState(null);
  const [parentSubmenu, setParentSubmenu] = useState(null);
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
    } else {
      setContent(newContent);
      setParentSubmenu(submenuItems ? { items: submenuItems, parentId } : null);
    }

    previousViewRef.current = currentView;
  }, [currentView, content]);

  const handleGridItemClick = (itemId, parentId, parentView = null) => {
    navigateToSubpage(itemId, parentId, parentView);
  };

  const renderContent = (contentData, view) => {
    if (!contentData) return null;
    
    // Home view
    if (view === 'home') {
      return (
        <div className="home-content">
          <div className="video-container home-video">
            <VideoPlayer 
              src="https://stream.mux.com/9iCvQyU2AW3HaJprVMaLiGdUdyTnVEa400q74fDZIcjM.m3u8"
              autoplay={true}
            />
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
          key={view}
          items={listItems} 
          onItemClick={(itemId, parentView) => {
            const clickedItem = listItems.find(item => item.id === itemId);
            if (clickedItem?.type === 'submenu') {
              // Open nested submenu (e.g. "More" inside Work)
              navigateToNestedSubmenu(itemId);
            } else {
              handleGridItemClick(itemId, parentSubmenu.parentId, parentView || nestedParentView);
            }
          }} 
        />
      );
    }
    
    // About page – custom layout
    if (contentData.isAboutPage) {
      // If aboutText is set, render a simple text block instead of the full layout
      if (contentData.aboutText) {
        // Group paragraphs: consecutive numbered items get wrapped in a single <ol>
        const paragraphs = contentData.aboutText.split('\n\n').map(p => p.trim()).filter(Boolean);
        const elements = [];
        let listBuffer = [];

        const flushList = () => {
          if (listBuffer.length > 0) {
            elements.push(
              <ol key={`ol-${elements.length}`}>
                {listBuffer.map((text, j) => <li key={j}>{text}</li>)}
              </ol>
            );
            listBuffer = [];
          }
        };

        for (const paragraph of paragraphs) {
          if (/^\d+\.\s/.test(paragraph)) {
            listBuffer.push(paragraph.replace(/^\d+\.\s/, ''));
          } else {
            flushList();
            elements.push(<p key={`p-${elements.length}`}>{paragraph}</p>);
          }
        }
        flushList();

        return (
          <div className="about-page">
            <div className="about-text-block">
              {elements}
            </div>
          </div>
        );
      }

      // Original about layout (cycling text, media carousel, skills footer)
      // Preserved for future use – remove the aboutText field from navigation data to re-enable
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
            <AboutMediaSlot />
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
    const hasCaseStudyHeader = isCaseStudy(contentData);
    return (
      <div className={`page-content ${isTextOnly ? 'text-only' : ''}`}>
        {hasCaseStudyHeader ? (
          <div className="case-study-header">
            <div className="case-study-header-row">
              <div className="case-study-left">
                <h1 className="case-study-title">{contentData.title}</h1>
                {contentData.description && <p className="case-study-description">{contentData.description}</p>}
                {contentData.link && (
                  <a className="case-study-link" href={contentData.link} target="_blank" rel="noopener noreferrer">
                    {linkLabel(contentData.link)} ↗
                  </a>
                )}
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
              if (block.type === 'text' || !block.src) return null;
              const fullSrc = block.src.startsWith('http') ? block.src : `${contentData.baseUrl || ''}${block.src}`;
              const isVideo = block.type === 'video' || /\.(mp4|mov|webm|m3u8)$/i.test(fullSrc);
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
                const isText = block.type === 'text';
                if (isText) {
                  return (
                    <div
                      key={index}
                      className="block-item block-text"
                      style={{ gridColumn: `${block.colStart} / span ${block.colSpan}` }}
                    >
                      <p>{block.content}</p>
                    </div>
                  );
                }
                const fullSrc = block.src.startsWith('http') ? block.src : `${contentData.baseUrl || ''}${block.src}`;
                const isVideo = block.type === 'video' || /\.(mp4|mov|webm|m3u8)$/i.test(fullSrc);
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
                        sizes={columnSizes((block.colSpan || 12) / 12)}
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
