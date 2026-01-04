import { useState, useEffect, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { theme } from '../config/theme';
import { R2Video, getR2VideoUrl } from '../utils/videoStreaming';
import VideoPlayer from './VideoPlayer';
import LoadingSpinner from './LoadingSpinner';
import gsap from 'gsap';
import './ContentArea.css';

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
      {currentSrc ? (
        <img 
          src={currentSrc}
          alt={alt}
          className={className}
        />
      ) : hasError ? (
        <div className="image-error-placeholder">
          <span>⟳</span>
        </div>
      ) : (
        <div className="image-placeholder">
          <LoadingSpinner size={32} />
          <span className="loading-percent">{Math.floor(loadProgress)}%</span>
        </div>
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
          <LoadingSpinner size={32} />
          <span className="loading-percent">{Math.floor(loadProgress)}%</span>
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
          <LoadingSpinner size={32} />
          <span className="loading-percent">{Math.floor(loadProgress)}%</span>
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
function LazyVideo({ src, poster }) {
  const videoRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
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
    const video = videoRef.current;
    if (!video) return;

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
      { threshold: 0.3 } // 30% visible to trigger
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

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

  if (hasError) {
    return (
      <div className="video-error-placeholder" onClick={handleRetry}>
        <span>⟳</span>
      </div>
    );
  }

  return (
    <div className={`lazy-video-wrapper ${isLoaded ? 'loaded' : 'loading'}`}>
      {!isLoaded && (
        <div className="video-loading-placeholder">
          <LoadingSpinner size={32} />
          <span className="loading-percent">{Math.floor(loadProgress)}%</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        onError={handleError}
        onLoadedData={handleLoadedData}
      />
    </div>
  );
}

function ContentArea() {
  const { currentView, navigateToSubpage } = useNavigationStore();
  const [content, setContent] = useState(null);
  const [parentSubmenu, setParentSubmenu] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentAreaRef = useRef(null);
  const contentInnerRef = useRef(null);
  const previousViewRef = useRef(currentView);
  const previousContentRef = useRef(null);

  // Handle expand/collapse animation
  const toggleExpand = () => {
    const contentArea = contentAreaRef.current;
    if (!contentArea) return;

    // Check if mobile
    const isMobile = window.innerWidth <= 768;

    // Get current computed values to animate from
    const currentLeft = parseFloat(getComputedStyle(contentArea).left);
    const currentWidth = parseFloat(getComputedStyle(contentArea).width);
    
    // Get all content elements that need to animate
    const contentElements = contentArea.querySelectorAll('.video-container:not(.full-bleed), .image-gallery, .video-gallery, .media-gallery');

    if (!isExpanded) {
      // EXPAND
      setIsExpanded(true);
      
      if (isMobile) {
        // Mobile: CSS handles the transition via .expanded class
        // Just toggle the state, CSS transitions do the rest
      } else {
        // Desktop: expand to full width
        gsap.fromTo(contentArea, 
          { left: currentLeft, width: currentWidth },
          {
            left: 8,
            width: window.innerWidth - 16,
            duration: 0.6,
            ease: 'power2.inOut'
          }
        );
        
        // Animate content with delay - use percentage-based margins for centering
        contentElements.forEach(el => {
          gsap.to(el, {
            maxWidth: '55%',
            marginLeft: '22.5%',
            marginRight: '22.5%',
            duration: 0.7,
            delay: 0.15,
            ease: 'power2.inOut'
          });
        });
      }
      
    } else {
      // COLLAPSE
      setIsExpanded(false);
      
      if (isMobile) {
        // Mobile: CSS handles the transition via removing .expanded class
        // Just toggle the state, CSS transitions do the rest
      } else {
        // Desktop: collapse back to original position
        // Animate content back to full width first
        contentElements.forEach(el => {
          gsap.to(el, {
            maxWidth: '100%',
            marginLeft: 0,
            marginRight: 0,
            duration: 0.5,
            ease: 'power2.inOut'
          });
        });
        
        // Animate container with delay
        gsap.fromTo(contentArea,
          { left: currentLeft, width: currentWidth },
          {
            left: window.innerWidth * 3 / 7,
            width: window.innerWidth * 4 / 7 - 16,
            duration: 0.6,
            delay: 0.3,
            ease: 'power2.inOut',
            onComplete: () => {
              contentArea.style.left = 'calc(100vw * 3 / 7)';
              contentArea.style.width = 'calc(100vw * 4 / 7 - 16px)';
            }
          }
        );
      }
    }
  };

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
      
      // Reset scroll position
      if (contentAreaRef.current) {
        contentAreaRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      
      // Pause all videos
      const allVideos = contentInnerRef.current.querySelectorAll('video');
      allVideos.forEach(video => video.pause());
      
      // Fade out current content
      gsap.to(contentInnerRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.inOut',
        onComplete: () => {
          // Update content while invisible
          previousContentRef.current = content;
          setContent(newContent);
          setParentSubmenu(submenuItems ? { items: submenuItems, parentId } : null);
          
          // Small delay to let new content render, then fade in
          setTimeout(() => {
            gsap.fromTo(
              contentInnerRef.current,
              { opacity: 0 },
              { 
                opacity: 1,
                duration: 0.3,
                ease: 'power2.inOut',
                onComplete: () => {
                  setIsTransitioning(false);
                }
              }
            );
          }, 50);
        }
      });
    } else {
      setContent(newContent);
      setParentSubmenu(submenuItems ? { items: submenuItems, parentId } : null);
    }

    previousViewRef.current = currentView;
  }, [currentView, content]);

  const handleGridItemClick = (itemId, parentId) => {
    navigateToSubpage(itemId, parentId);
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
    
    // Grid view for submenu landing pages
    if (contentData.isGrid && parentSubmenu?.items) {
      return (
        <div className="grid-content">
          <div className="video-grid">
            {parentSubmenu.items.slice(0, 9).map((item) => {
              const videoSrc = getVideoSrc(item);
              const thumbnailSrc = item.content?.thumbnail;
              const isVideoThumbnail = thumbnailSrc && (thumbnailSrc.endsWith('.mp4') || thumbnailSrc.endsWith('.mov') || thumbnailSrc.endsWith('.webm'));
              return (
                <div 
                  key={item.id} 
                  className="grid-item"
                  onClick={() => handleGridItemClick(item.id, parentSubmenu.parentId)}
                >
                  {thumbnailSrc ? (
                    isVideoThumbnail ? (
                      <GridVideo
                        src={thumbnailSrc}
                      />
                    ) : (
                      <GridImage
                        src={thumbnailSrc}
                        alt={item.title}
                      />
                    )
                  ) : videoSrc && (
                    <GridVideo
                      src={videoSrc}
                    />
                  )}
                  <div className="grid-item-overlay">
                    <span className="grid-item-title">{item.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Check if this is a text-only page (no media)
    // Check if this is a text-only page (no media)
    const isTextOnly = !contentData.videoUrl && !contentData.videoKey && 
                       !contentData.imageGallery && !contentData.videoGallery && 
                       !contentData.mediaGallery && !contentData.sections &&
                       !contentData.contactLinks;
    
    // Regular page view
    return (
      <div className={`page-content ${isTextOnly ? 'text-only' : ''}`}>
        <div className="page-header">
          <h1>{contentData.title}</h1>
          {contentData.description && <p className="description">{contentData.description}</p>}
        </div>
        {contentData.contactLinks && (
          <div className="contact-links">
            {contentData.contactLinks.map((link, index) => (
              <p key={index} className="contact-link-item">
                {link.label}: <a href={link.href} target="_blank" rel="noopener noreferrer">{link.value}</a>
              </p>
            ))}
          </div>
        )}
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
                  onClick={() => contentData.imageGallery.clickToExpand && setLightboxImage(`${contentData.imageGallery.baseUrl}${image}`)}
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
                      onClick={() => section.imageGallery.clickToExpand && setLightboxImage(`${section.imageGallery.baseUrl}${image}`)}
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
    <div className={`content-area ${isExpanded ? 'expanded' : ''}`} ref={contentAreaRef}>
      <button 
        className={`expand-button ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpand}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      />
      {content && (
        <div className="content-slide-wrapper" ref={contentInnerRef}>
          <div className="content-inner">
            {renderContent(content, currentView)}
          </div>
        </div>
      )}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>×</button>
          <img src={lightboxImage} alt="Fullscreen view" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

export default ContentArea;
