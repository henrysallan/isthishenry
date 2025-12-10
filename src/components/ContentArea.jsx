import { useState, useEffect, useRef } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { navigationData } from '../data/navigation';
import { theme } from '../config/theme';
import { R2Video } from '../utils/videoStreaming';
import gsap from 'gsap';
import './ContentArea.css';

function ContentArea() {
  const { currentView } = useNavigationStore();
  const [content, setContent] = useState(null);
  const [displayContent, setDisplayContent] = useState(null);
  const contentInnerRef = useRef(null);
  const previousViewRef = useRef(currentView);

  useEffect(() => {
    const findContent = (items) => {
      for (const item of items) {
        if (item.id === currentView) {
          return item.content;
        }
        if (item.submenu) {
          const found = findContent(item.submenu);
          if (found) return found;
        }
      }
      return null;
    };

    let newContent = null;
    if (currentView === 'home') {
      newContent = navigationData.home.content;
    } else if (currentView) {
      newContent = findContent(navigationData.mainMenu);
    }

    // If we're changing views and have current content, animate out first
    if (previousViewRef.current !== currentView && contentInnerRef.current && displayContent) {
      gsap.to(contentInnerRef.current, {
        opacity: 0,
        filter: 'blur(5px)',
        duration: theme.animation.duration * 0.1,
        ease: theme.animation.ease,
        onComplete: () => {
          setContent(newContent);
          setDisplayContent(newContent);
        }
      });
    } else {
      setContent(newContent);
      setDisplayContent(newContent);
    }

    previousViewRef.current = currentView;
  }, [currentView, displayContent]);

  useEffect(() => {
    if (contentInnerRef.current && content) {
      // Animate content in
      gsap.fromTo(
        contentInnerRef.current,
        { opacity: 0, filter: 'blur(5px)' },
        { 
          opacity: 1,
          filter: 'blur(0px)',
          duration: theme.animation.duration,
          ease: theme.animation.ease 
        }
      );
    }
  }, [content]);

  return (
    <div className="content-area">
      {displayContent && (
        <div className="content-inner" ref={contentInnerRef}>
          {currentView === 'home' ? (
            <div className="home-content">
              <div className="video-container full-bleed">
                <R2Video videoKey="home-reel.mp4" />
              </div>
            </div>
          ) : (
            <div className="page-content">
              <div className="page-header">
                <h1>{displayContent.title}</h1>
                <p className="description">{displayContent.description}</p>
              </div>
              {displayContent.videoKey && (
                <div className="video-container">
                  <R2Video videoKey={displayContent.videoKey} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContentArea;
