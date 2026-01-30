import { useEffect, useRef, useState } from 'react';
import { EmptyState } from './EmptyState';
import { ImageInfoToolbar } from './ImageInfoToolbar';

async function findImages(folderName) {
  const extensions = ['png', 'jpg', 'jpeg', 'exr', 'hdr'];
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

export function ViewerContainer({ currentFolder, currentComparison, theme, showToolbar = true }) {
  const containerRef = useRef(null);
  const [viewerState, setViewerState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentImages, setCurrentImages] = useState({ A: null, B: null });

  useEffect(() => {
    if (!currentFolder || !currentComparison) {
      setViewerState('idle');
      setCurrentImages({ A: null, B: null });
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    let cancelled = false;

    async function loadViewer() {
      setViewerState('loading');
      setErrorMessage('');

      let images;

      if (currentComparison.isLocal) {
        // Use object URLs from local comparison
        images = {
          A: currentComparison.images.A.url,
          B: currentComparison.images.B.url,
        };
      } else {
        // Fetch from server folder
        images = await findImages(currentComparison.folder);
      }

      if (cancelled) return;

      setCurrentImages({ A: images.A, B: images.B });

      if (!images.A && !images.B) {
        setViewerState('error');
        setErrorMessage(`No A or B images found in "${currentFolder}"`);
        return;
      }

      const children = [];
      if (images.A) children.push({ title: 'A', image: images.A });
      if (images.B) children.push({ title: 'B', image: images.B });

      const data =
        children.length === 1
          ? { title: currentFolder, image: children[0].image }
          : { title: currentFolder, children };

      if (typeof window.Jeri === 'undefined') {
        setViewerState('error');
        setErrorMessage('JERI library not loaded');
        return;
      }

      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          window.Jeri.renderViewer(containerRef.current, data);
          setViewerState('ready');
        }
      } catch (err) {
        console.error('JERI render error:', err);
        setViewerState('error');
        setErrorMessage(err.message);
      }
    }

    loadViewer();

    return () => {
      cancelled = true;
    };
  }, [currentFolder, currentComparison]);

  return (
    <div className="h-full overflow-hidden relative">
      {/* Always render the container for JERI */}
      <div
        ref={containerRef}
        className={`absolute inset-0 [&>div]:absolute [&>div]:inset-0 [&>div]:!w-full [&>div]:!h-full ${
          viewerState === 'ready' ? '' : 'invisible'
        } ${theme === 'dark' ? 'jeri-dark' : 'jeri-light'}`}
      />

      {/* Overlay states */}
      {viewerState === 'idle' && (
        <EmptyState>
          <p>No comparison selected</p>
        </EmptyState>
      )}

      {viewerState === 'loading' && (
        <EmptyState>
          <p>Loading images...</p>
        </EmptyState>
      )}

      {viewerState === 'error' && (
        <EmptyState>
          <p className="text-red-400">{errorMessage}</p>
          <p className="my-2">Expected: A.exr/png/jpg and B.exr/png/jpg</p>
        </EmptyState>
      )}

      {viewerState === 'ready' && showToolbar && (
        <ImageInfoToolbar imageA={currentImages.A} imageB={currentImages.B} />
      )}
    </div>
  );
}
