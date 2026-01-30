import { useEffect, useRef, useCallback } from 'react';

// Global image cache - persists across component remounts
const imageCache = new Map();
// Cache discovered URLs by folder ID - avoids repeated HEAD requests
const urlCache = new Map();

const extensions = ['png', 'jpg', 'jpeg', 'exr', 'hdr'];

async function findImageUrls(folderName) {
  const images = { A: null, B: null };
  const baseUrl = import.meta.env.BASE_URL;

  for (const ext of extensions) {
    if (!images.A) {
      const aUrl = `${baseUrl}images/${folderName}/A.${ext}`;
      try {
        const resp = await fetch(aUrl, { method: 'HEAD' });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.startsWith('image/')) {
          images.A = aUrl;
        }
      } catch {}
    }
    if (!images.B) {
      const bUrl = `${baseUrl}images/${folderName}/B.${ext}`;
      try {
        const resp = await fetch(bUrl, { method: 'HEAD' });
        const contentType = resp.headers.get('content-type') || '';
        if (resp.ok && contentType.startsWith('image/')) {
          images.B = bUrl;
        }
      } catch {}
    }
    if (images.A && images.B) break;
  }

  return images;
}

// Get cached URLs for a folder, or discover them if not cached
export async function getImageUrls(folderId, localComp = null) {
  // Check URL cache first
  if (urlCache.has(folderId)) {
    return urlCache.get(folderId);
  }

  let urls;
  if (localComp) {
    urls = {
      A: localComp.images.A.url,
      B: localComp.images.B.url,
    };
  } else {
    urls = await findImageUrls(folderId);
  }

  // Cache the discovered URLs
  urlCache.set(folderId, urls);
  return urls;
}

function preloadImage(url) {
  if (!url || imageCache.has(url)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function useImageCache(folders, localComparisons, currentFolder) {
  const preloadingRef = useRef(new Set());

  const preloadComparison = useCallback(async (folderId, isLocal, localComp) => {
    if (preloadingRef.current.has(folderId)) return;
    preloadingRef.current.add(folderId);

    try {
      // Use the shared getImageUrls which caches discovered URLs
      const urls = await getImageUrls(folderId, isLocal ? localComp : null);

      await Promise.all([
        preloadImage(urls.A),
        preloadImage(urls.B),
      ]);
    } catch (e) {
      // Ignore preload errors
    }
  }, []);

  // Preload all comparisons immediately
  useEffect(() => {
    const allComparisons = [...folders, ...localComparisons.map(c => c.id)];
    if (allComparisons.length === 0) return;

    allComparisons.forEach(folderId => {
      const localComp = localComparisons.find(c => c.id === folderId);
      preloadComparison(folderId, !!localComp, localComp);
    });
  }, [folders, localComparisons, preloadComparison]);

  return { imageCache };
}

export function getCachedImage(url) {
  return imageCache.get(url);
}

export function isImageCached(url) {
  return imageCache.has(url);
}
