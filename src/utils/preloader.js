// Asset preloader - fetches all portfolio assets in the background
import { navigationData } from '../data/navigation';

// Extract all asset URLs from navigation data
function getAllAssetUrls() {
  const urls = {
    videos: new Set(),
    images: new Set()
  };

  // Home reel (highest priority)
  urls.videos.add('https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4');

  // Extract from work items
  const workMenu = navigationData.mainMenu.find(item => item.id === 'work');
  if (workMenu?.submenu) {
    workMenu.submenu.forEach(item => {
      const content = item.content;
      
      // Thumbnails (priority - shown in grid)
      if (content?.thumbnail) {
        if (isVideo(content.thumbnail)) {
          urls.videos.add(content.thumbnail);
        } else {
          urls.images.add(content.thumbnail);
        }
      }

      // Main video
      if (content?.videoUrl) {
        urls.videos.add(content.videoUrl);
      }

      // Video gallery
      if (content?.videoGallery?.videos) {
        content.videoGallery.videos.forEach(url => urls.videos.add(url));
      }

      // Image gallery
      if (content?.imageGallery) {
        const baseUrl = content.imageGallery.baseUrl;
        content.imageGallery.images.forEach(img => {
          urls.images.add(`${baseUrl}${img}`);
        });
      }

      // Media gallery (mixed)
      if (content?.mediaGallery) {
        const baseUrl = content.mediaGallery.baseUrl;
        content.mediaGallery.items.forEach(item => {
          const url = `${baseUrl}${item}`;
          if (isVideo(item)) {
            urls.videos.add(url);
          } else {
            urls.images.add(url);
          }
        });
      }
    });
  }

  return {
    videos: Array.from(urls.videos),
    images: Array.from(urls.images)
  };
}

function isVideo(url) {
  return url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm');
}

// Preload a video by creating a video element and loading metadata
function preloadVideo(url, priority = 'low', retries = 2) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const attemptLoad = () => {
      attempts++;
      const video = document.createElement('video');
      video.preload = priority === 'high' ? 'auto' : 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      // Timeout for stalled requests
      const timeout = setTimeout(() => {
        video.src = ''; // Cancel the request
        if (attempts < retries) {
          console.log(`[Preloader] Video timeout, retrying (${attempts}/${retries}): ${url}`);
          setTimeout(attemptLoad, 500 * attempts); // Backoff
        } else {
          resolve({ url, success: false, type: 'video', error: 'timeout' });
        }
      }, 15000); // 15 second timeout
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve({ url, success: true, type: 'video' });
      };
      
      video.onerror = () => {
        clearTimeout(timeout);
        if (attempts < retries) {
          console.log(`[Preloader] Video error, retrying (${attempts}/${retries}): ${url}`);
          setTimeout(attemptLoad, 500 * attempts); // Backoff
        } else {
          resolve({ url, success: false, type: 'video', error: 'load_error' });
        }
      };
      
      // Add cache-busting for retries to avoid cached failures
      const finalUrl = attempts > 1 ? `${url}${url.includes('?') ? '&' : '?'}_retry=${attempts}` : url;
      video.src = finalUrl;
    };
    
    attemptLoad();
  });
}

// Preload an image with retry logic
function preloadImage(url, retries = 2) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const attemptLoad = () => {
      attempts++;
      const img = new Image();
      
      // Timeout for stalled requests
      const timeout = setTimeout(() => {
        img.src = ''; // Cancel the request
        if (attempts < retries) {
          console.log(`[Preloader] Image timeout, retrying (${attempts}/${retries}): ${url}`);
          setTimeout(attemptLoad, 500 * attempts); // Backoff
        } else {
          resolve({ url, success: false, type: 'image', error: 'timeout' });
        }
      }, 10000); // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve({ url, success: true, type: 'image' });
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        if (attempts < retries) {
          console.log(`[Preloader] Image error, retrying (${attempts}/${retries}): ${url}`);
          setTimeout(attemptLoad, 500 * attempts); // Backoff
        } else {
          resolve({ url, success: false, type: 'image', error: 'load_error' });
        }
      };
      
      // Add cache-busting for retries to avoid cached failures
      const finalUrl = attempts > 1 ? `${url}${url.includes('?') ? '&' : '?'}_retry=${attempts}` : url;
      img.src = finalUrl;
    };
    
    attemptLoad();
  });
}

// Main preloader function - call this on app mount
export async function preloadAllAssets(onProgress) {
  const { videos, images } = getAllAssetUrls();
  const totalAssets = videos.length + images.length;
  let loadedCount = 0;

  console.log(`[Preloader] Starting to preload ${videos.length} videos and ${images.length} images`);

  // Priority 1: Home reel and grid thumbnails (first 9 items)
  const priorityVideos = videos.slice(0, 9);
  const priorityImages = images.slice(0, 9);

  // Load priority assets first (in parallel, but limited concurrency)
  const priorityPromises = [
    ...priorityVideos.map(url => preloadVideo(url, 'high')),
    ...priorityImages.map(url => preloadImage(url))
  ];

  for (const promise of priorityPromises) {
    await promise;
    loadedCount++;
    onProgress?.(loadedCount / totalAssets);
  }

  console.log('[Preloader] Priority assets loaded');

  // Priority 2: Load remaining assets with lower priority
  const remainingVideos = videos.slice(9);
  const remainingImages = images.slice(9);

  // Load in batches to avoid overwhelming the browser
  const batchSize = 4;
  const remainingAssets = [
    ...remainingImages.map(url => () => preloadImage(url)),
    ...remainingVideos.map(url => () => preloadVideo(url, 'low'))
  ];

  for (let i = 0; i < remainingAssets.length; i += batchSize) {
    const batch = remainingAssets.slice(i, i + batchSize);
    await Promise.all(batch.map(fn => fn()));
    loadedCount += batch.length;
    onProgress?.(loadedCount / totalAssets);
  }

  console.log('[Preloader] All assets preloaded');
  return { totalAssets, loadedCount };
}

// Lightweight version - just preload thumbnails for the work grid
export async function preloadGridThumbnails() {
  const workMenu = navigationData.mainMenu.find(item => item.id === 'work');
  if (!workMenu?.submenu) return;

  const thumbnails = workMenu.submenu
    .slice(0, 9)
    .map(item => {
      const content = item.content;
      return content?.thumbnail || content?.videoUrl;
    })
    .filter(Boolean);

  console.log('[Preloader] Preloading grid thumbnails:', thumbnails.length);

  await Promise.all(
    thumbnails.map(url => 
      isVideo(url) ? preloadVideo(url, 'high') : preloadImage(url)
    )
  );

  console.log('[Preloader] Grid thumbnails loaded');
}

// Export URL getter for use in preload hints
export function getCriticalAssetUrls() {
  const urls = [];
  
  // Home reel
  urls.push({
    url: 'https://cdn.isthishenry.com/REEL_2025_07_A_HENRYALLAN_mp42k2.mp4',
    type: 'video'
  });

  // Work grid thumbnails
  const workMenu = navigationData.mainMenu.find(item => item.id === 'work');
  if (workMenu?.submenu) {
    workMenu.submenu.slice(0, 9).forEach(item => {
      const content = item.content;
      const thumbnail = content?.thumbnail || content?.videoUrl;
      if (thumbnail) {
        urls.push({
          url: thumbnail,
          type: isVideo(thumbnail) ? 'video' : 'image'
        });
      }
    });
  }

  return urls;
}
